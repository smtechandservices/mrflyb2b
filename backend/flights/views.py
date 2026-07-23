from django.http import HttpResponse, Http404
from django.db.models import Q

from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes
from .models import Flight, Booking, ContactMessage, UserProfile, WalletTransaction, TopUpRequest, Flyer
from .serializers import (
    UserSerializer, RegisterSerializer, FlightSerializer, 
    BookingSerializer, AdminBookingSerializer, ContactMessageSerializer,
    UserProfileSerializer, AdminUserSerializer, WalletTransactionSerializer,
    TopUpRequestSerializer, FlyerSerializer
)
from .permissions import IsAdminType
from rest_framework import filters
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.authentication import TokenAuthentication
import uuid
from datetime import date
from decimal import Decimal, InvalidOperation
import razorpay
from django.conf import settings

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer

class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = (IsAuthenticated,)

    def get_object(self):
        return self.request.user

class FlightListView(generics.ListAPIView):
    serializer_class = FlightSerializer

    def get_queryset(self):
        from django.db.models import Count, F, Q
        from django.utils import timezone
        from datetime import timedelta
        
        origin = self.request.query_params.get('origin')
        destination = self.request.query_params.get('destination')
        date = self.request.query_params.get('date')
        flight_id = self.request.query_params.get('id')
        passengers = self.request.query_params.get('passengers')

        # Annotate with number of bookings to calculate available seats
        # We count CONFIRMED and PENDING bookings as taking up a seat
        booked_filter = Q(bookings__status='CONFIRMED') | Q(bookings__status='PENDING')

        queryset = Flight.objects.filter(is_hidden=False).annotate(
            booked_seats_count=Count('bookings', filter=booked_filter)
        )

        if not flight_id:
            from django.utils import timezone
            queryset = queryset.filter(departure_time__gt=timezone.now())

        # Filter by passenger capacity if specified
        if passengers:
            try:
                passengers_count = int(passengers)
                queryset = queryset.filter(
                    total_seats__gte=F('booked_seats_count') + passengers_count
                )
            except (ValueError, TypeError):
                queryset = queryset.filter(
                    total_seats__gt=F('booked_seats_count')
                )
        else:
            queryset = queryset.filter(
                total_seats__gt=F('booked_seats_count')
            )
        
        # Get filter parameters (can have multiple values)
        stops_filters = self.request.query_params.getlist('stops')
        airlines_filters = self.request.query_params.getlist('airlines')
        departure_time_filters = self.request.query_params.getlist('departure_time')
        arrival_time_filters = self.request.query_params.getlist('arrival_time')

        if flight_id:
            return queryset.filter(id=flight_id)

        if origin:
            queryset = queryset.filter(origin__icontains=origin)
        if destination:
            queryset = queryset.filter(destination__icontains=destination)
        if date:
            print(f"DEBUG: Filtering by date: {date}")
            queryset = queryset.filter(departure_time__date=date)
            print(f"DEBUG: Queryset count after date filter: {queryset.count()}")
            if queryset.exists():
                print(f"DEBUG: Sample flight departure: {queryset.first().departure_time}")
            else:
                print("DEBUG: No flights found after date filter.")
                all_route_flights = Flight.objects.filter(origin__icontains=origin, destination__icontains=destination)
                print(f"DEBUG: Total flights for this route: {all_route_flights.count()}")
                for f in all_route_flights[:5]:
                    print(f"DEBUG: Flight {f.flight_number} departs {f.departure_time}")
        
        # Filter by stops
        if stops_filters:
            from django.db.models import Q
            stops_q = Q()
            for stop_filter in stops_filters:
                if stop_filter == 'non-stop':
                    stops_q |= Q(stops=0)
                elif stop_filter == '1-stop':
                    stops_q |= Q(stops=1)
                elif stop_filter == '2-plus-stops':
                    stops_q |= Q(stops__gte=2)
            if stops_q:
                queryset = queryset.filter(stops_q)

        # Filter by airlines
        if airlines_filters:
            queryset = queryset.filter(airline__in=airlines_filters)

        # Filter by departure time
        if departure_time_filters:
            from django.db.models import Q
            from datetime import time as dt_time
            time_q = Q()
            for time_filter in departure_time_filters:
                if time_filter == 'early-morning':
                    time_q |= Q(departure_time__hour__gte=0, departure_time__hour__lt=6)
                elif time_filter == 'morning':
                    time_q |= Q(departure_time__hour__gte=6, departure_time__hour__lt=12)
                elif time_filter == 'afternoon':
                    time_q |= Q(departure_time__hour__gte=12, departure_time__hour__lt=18)
                elif time_filter == 'evening':
                    time_q |= Q(departure_time__hour__gte=18, departure_time__hour__lt=24)
            if time_q:
                queryset = queryset.filter(time_q)

        # Filter by arrival time
        if arrival_time_filters:
            from django.db.models import Q
            time_q = Q()
            for time_filter in arrival_time_filters:
                if time_filter == 'early-morning':
                    time_q |= Q(arrival_time__hour__gte=0, arrival_time__hour__lt=6)
                elif time_filter == 'morning':
                    time_q |= Q(arrival_time__hour__gte=6, arrival_time__hour__lt=12)
                elif time_filter == 'afternoon':
                    time_q |= Q(arrival_time__hour__gte=12, arrival_time__hour__lt=18)
                elif time_filter == 'evening':
                    time_q |= Q(arrival_time__hour__gte=18, arrival_time__hour__lt=24)
            if time_q:
                queryset = queryset.filter(time_q)
        
        return queryset

class BookingCreateView(generics.CreateAPIView):
    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticated]


    def create(self, request, *args, **kwargs):
        passengers = request.data.get('passengers', [])
        payment_mode = 'WALLET' # Hardcode to WALLET for all new bookings
        
        if not passengers:
             # Fallback for single passenger data direct in request root (Legacy support)
             # NOTE: This path needs update for wallet logic if we want to support it fully.
             # For now, let's assume the new bulk format is primary.
             return super().create(request, *args, **kwargs)
        
        # Calculate total cost (Infants 0-2 yrs are free)
        flight_id = request.data.get('flight')
        try:
            flight = Flight.objects.get(id=flight_id)
        except Flight.DoesNotExist:
            return Response({'error': 'Flight not found'}, status=status.HTTP_404_NOT_FOUND)
            
        total_cost = Decimal('0.00')
        for p in passengers:
            dob_str = p.get('date_of_birth')
            is_infant = False
            if dob_str:
                try:
                    # dob_str is YYYY-MM-DD
                    y, m, d = map(int, dob_str.split('-'))
                    dob = date(y, m, d)
                    today = date.today()
                    age = today.year - dob.year - ((today.month, today.day) < (m, d))
                    if age <= 2:
                        is_infant = True
                except (ValueError, TypeError, AttributeError):
                    pass
            
            if is_infant:
                total_cost += flight.infant_price
            else:
                total_cost += flight.price
        user = request.user
        profile = user.profile

        # KYC Verification Check
        from .models import UserKYC
        kyc, created = UserKYC.objects.get_or_create(user=user)
        
        if kyc.kyc_status != 'VERIFIED':
            return Response({
                'error': 'KYC Verification Required',
                'details': 'Please complete your KYC verification (Aadhar and PAN) to book flights.',
                'kyc_status': kyc.kyc_status
            }, status=status.HTTP_403_FORBIDDEN)

        # Ensure prices are decimals
        total_cost = Decimal(str(total_cost))

        # Wallet Logic (Mandatory for all bookings now)
        if True: # Always enforce wallet deduction logic
            available_funds = profile.wallet_balance + (profile.credit_limit - profile.total_dues)
            if available_funds < total_cost:
                return Response({
                    'error': 'Insufficient funds/credit limit',
                    'available': available_funds,
                    'required': total_cost
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Deduct funds
            spent_from_wallet = Decimal('0.00')
            added_to_dues = Decimal('0.00')

            if profile.wallet_balance >= total_cost:
                profile.wallet_balance -= total_cost
                spent_from_wallet = total_cost
            else:
                spent_from_wallet = profile.wallet_balance
                remaining_cost = total_cost - profile.wallet_balance
                profile.wallet_balance = Decimal('0.00')
                profile.total_dues += remaining_cost
                added_to_dues = remaining_cost
            
            profile.save()

            # Record Transaction
            WalletTransaction.objects.create(
                user=user,
                amount=total_cost,
                transaction_type='DEBIT',
                description=f"Booking for {len(passengers)} passengers on flight {flight.flight_number}. Wallet: {spent_from_wallet}, Credit used: {added_to_dues}.",
                balance_after=profile.wallet_balance,
                dues_after=profile.total_dues
            )

        booking_group = f"GRP-{uuid.uuid4().hex[:8].upper()}"
        pnr = flight.pnr
        response_data = []
        
        travel_date = request.data.get('travel_date')

        for p_data in passengers:
            # Mix in group level data
            p_data['flight'] = flight_id
            p_data['travel_date'] = travel_date
            p_data['payment_mode'] = payment_mode
            
            serializer = self.get_serializer(data=p_data)
            serializer.is_valid(raise_exception=True)
            
            booking_id = f"TNR-{uuid.uuid4().hex[:8].upper()}"
            
            # Determine if infant to set historical price and tag correctly
            dob_str = p_data.get('date_of_birth')
            is_infant_passenger = False
            passenger_charged_price = flight.price
            
            if dob_str:
                try:
                    y, m, d = map(int, dob_str.split('-'))
                    dob = date(y, m, d)
                    today = date.today()
                    age = today.year - dob.year - ((today.month, today.day) < (m, d))
                    if age <= 2:
                        is_infant_passenger = True
                        passenger_charged_price = flight.infant_price
                except (ValueError, TypeError, AttributeError):
                    pass

            serializer.save(
                booking_id=booking_id, 
                status='CONFIRMED',
                booked_by=request.user,
                booking_group=booking_group,
                pnr=pnr,
                is_infant=is_infant_passenger,
                charged_price=passenger_charged_price
            )
            response_data.append(serializer.data)
            
        return Response(response_data[0] if len(response_data) == 1 else response_data, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        # This is for single create, simplified wallet logic (might need expansion if single create is used)
        booking_id = f"TNR-{uuid.uuid4().hex[:8].upper()}"
        
        # Get flight from validated data
        flight = serializer.validated_data.get('flight')
        airline = flight.airline if flight else 'TNR'
        
        pnr = flight.pnr if flight else None
        # Determine if infant to set historical price and tag correctly
        dob_str = serializer.validated_data.get('date_of_birth')
        is_infant_passenger = False
        passenger_charged_price = flight.price if flight else Decimal('0.00')
        
        if dob_str:
            try:
                from datetime import date as dt_date
                if isinstance(dob_str, dt_date):
                    dob = dob_str
                else:
                    y, m, d = map(int, str(dob_str).split('-'))
                    dob = dt_date(y, m, d)
                
                today = dt_date.today()
                age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
                if age <= 2:
                    is_infant_passenger = True
                    passenger_charged_price = flight.infant_price
            except (ValueError, TypeError, AttributeError):
                pass

        serializer.save(
            booking_id=booking_id, 
            status='CONFIRMED',
            booked_by=self.request.user,
            pnr=pnr,
            is_infant=is_infant_passenger,
            charged_price=passenger_charged_price
        )

class CheckDuplicateBookingView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        flight_id = request.data.get('flight')
        passengers = request.data.get('passengers', [])
        
        if not flight_id or not passengers:
            return Response({'error': 'Flight ID and passengers are required'}, status=status.HTTP_400_BAD_REQUEST)

        duplicates = []
        for p in passengers:
            first_name = p.get('first_name', '').strip()
            last_name = p.get('last_name', '').strip()
            passport_number = p.get('passport_number', '').strip()
            passenger_email = p.get('passenger_email', '').strip()
            passenger_phone = p.get('passenger_phone', '').strip()

            if not first_name or not last_name:
                continue

            # Check each field individually to provide specific feedback
            match_field = None
            
            # Name check
            if Booking.objects.filter(booked_by=request.user, flight_id=flight_id, first_name__iexact=first_name, last_name__iexact=last_name).exclude(status__in=['CANCELLED', 'REJECTED', 'PENDING']).exists():
                match_field = "Name"
            # Passport check
            elif passport_number and Booking.objects.filter(booked_by=request.user, flight_id=flight_id, passport_number=passport_number).exclude(status__in=['CANCELLED', 'REJECTED', 'PENDING']).exists():
                match_field = "Passport Number"
            # Email check
            elif passenger_email and Booking.objects.filter(booked_by=request.user, flight_id=flight_id, passenger_email__iexact=passenger_email).exclude(status__in=['CANCELLED', 'REJECTED', 'PENDING']).exists():
                match_field = "Email Address"
            # Phone check
            elif passenger_phone and Booking.objects.filter(booked_by=request.user, flight_id=flight_id, passenger_phone=passenger_phone).exclude(status__in=['CANCELLED', 'REJECTED', 'PENDING']).exists():
                match_field = "Phone Number"

            if match_field:
                duplicates.append({
                    'first_name': first_name,
                    'last_name': last_name,
                    'reason': f"Duplicate found by {match_field}."
                })

        return Response({
            'has_duplicates': len(duplicates) > 0,
            'duplicates': duplicates
        })


class BookingHistoryView(generics.ListAPIView):
    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Booking.objects.filter(booked_by=self.request.user).order_by('-created_at')

class ContactCreateView(generics.CreateAPIView):
    serializer_class = ContactMessageSerializer

class SearchMetaView(generics.RetrieveAPIView):
    permission_classes = (AllowAny,)
    
    def get(self, request, *args, **kwargs):
        origin_param = request.query_params.get('origin')
        dest_param = request.query_params.get('destination')
        passengers = request.query_params.get('passengers', 1)
        try:
            passengers = int(passengers)
        except (ValueError, TypeError):
            passengers = 1

        # Base query for determining valid destinations/dates
        flights = Flight.objects.filter(is_hidden=False, total_seats__gte=passengers)

        # Origins: Always return all unique origins (or could filter if needed, but usually we want all)
        origins = flights.values_list('origin', flat=True).distinct()

        # Destinations: Filter by origin if selected
        dest_qs = flights
        if origin_param:
            dest_qs = dest_qs.filter(origin__icontains=origin_param)
        destinations = dest_qs.values_list('destination', flat=True).distinct()

        # Dates: Filter by origin AND destination if selected
        date_qs = flights
        if origin_param:
            date_qs = date_qs.filter(origin__icontains=origin_param)
        if dest_param:
            date_qs = date_qs.filter(destination__icontains=dest_param)
        
        from django.utils import timezone
        date_qs = date_qs.filter(departure_time__gt=timezone.now())
        dates = date_qs.dates('departure_time', 'day')

        return_dates = []
        if origin_param and dest_param:
            return_date_qs = flights.filter(
                origin__icontains=dest_param,
                destination__icontains=origin_param,
                departure_time__gt=timezone.now()
            )
            return_dates = return_date_qs.dates('departure_time', 'day')
        
        return Response({
            'origins': list(origins),
            'destinations': list(destinations),
            'dates': [d.strftime('%Y-%m-%d') for d in dates],
            'return_dates': [d.strftime('%Y-%m-%d') for d in return_dates]
        })

class AvailableAirlinesView(generics.RetrieveAPIView):
    permission_classes = (AllowAny,)
    
    def get(self, request, *args, **kwargs):
        """Get unique airlines based on search criteria"""
        origin = request.query_params.get('origin')
        destination = request.query_params.get('destination')
        date = request.query_params.get('date')
        passengers = request.query_params.get('passengers', 1)
        try:
            passengers = int(passengers)
        except (ValueError, TypeError):
            passengers = 1
        
        queryset = Flight.objects.filter(is_hidden=False, total_seats__gte=passengers)
        
        if origin:
            queryset = queryset.filter(origin__icontains=origin)
        if destination:
            queryset = queryset.filter(destination__icontains=destination)
        if date:
            queryset = queryset.filter(departure_time__date=date)
        
        # Get unique airlines
        airlines = queryset.values_list('airline', flat=True).distinct().order_by('airline')
        
        return Response({
            'airlines': list(airlines)
        })

@api_view(['POST'])
@permission_classes([AllowAny])
def cleanup_flight_data(request):
    """
    Deletes unbooked flights that have already departed.
    """
    from django.utils import timezone
    from datetime import timedelta
    now = timezone.now()
    
    # 1. Delete unbooked flights that have departed (immediate cleanup)
    expired_unbooked_flights = Flight.objects.filter(
        departure_time__lt=now,
        bookings__isnull=True
    )
    unbooked_count = expired_unbooked_flights.count()
    if unbooked_count > 0:
        expired_unbooked_flights.delete()

    # 2. Delete booked flights that are older than 90 days (preserve recent history)
    cutoff_date = now - timedelta(days=90)
    old_booked_flights = Flight.objects.filter(
        departure_time__lt=cutoff_date,
        bookings__isnull=False
    )
    booked_count = old_booked_flights.count()
    if booked_count > 0:
        old_booked_flights.delete()
    
    total_deleted = unbooked_count + booked_count
    
    message = f'Cleanup complete. Deleted {unbooked_count} unbooked flights and {booked_count} old booked flights (>90 days).'
    return Response({'message': message, 'count': total_deleted}, status=status.HTTP_200_OK)

# Admin Views
class AdminFlightListCreateView(generics.ListCreateAPIView):
    serializer_class = FlightSerializer
    permission_classes = [IsAdminType]

    def get_queryset(self):
        from django.utils import timezone
        queryset = Flight.objects.filter(departure_time__gt=timezone.now()).order_by('departure_time')
        search = self.request.query_params.get('search')
        if search:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(airline__icontains=search) |
                Q(flight_number__icontains=search) |
                Q(origin__icontains=search) |
                Q(destination__icontains=search)
            )
        return queryset

class AdminFlightDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Flight.objects.all()
    serializer_class = FlightSerializer
    permission_classes = [IsAdminType]

class AdminFlightBulkCreateView(generics.CreateAPIView):
    queryset = Flight.objects.all()
    serializer_class = FlightSerializer
    permission_classes = [IsAdminType]

    def create(self, request, *args, **kwargs):
        data = request.data
        if isinstance(data, list):
            for item in data:
                # Map yyyy-mm-dd/hh:mm:ss to ISO format
                for field in ['departure_time', 'arrival_time']:
                    val = item.get(field)
                    if val and isinstance(val, str) and '/' in val:
                        date_part, time_part = val.split('/')
                        # Replace dashes with colons in time if necessary
                        time_part = time_part.replace('-', ':')
                        item[field] = f"{date_part}T{time_part}"
            
            created_data = []
            duplicate_details = []
            for item in data:
                serializer = self.get_serializer(data=item)
                if serializer.is_valid():
                    self.perform_create(serializer)
                    created_data.append(serializer.data)
                else:
                    airline = item.get('airline', 'Unknown Airline')
                    flight_num = item.get('flight_number', 'Unknown Flight')
                    
                    # Extract the first error message to be clear
                    err_msgs = []
                    is_duplicate = False
                    for field, errors in serializer.errors.items():
                        if field == 'non_field_errors' and any("already exists" in str(e) for e in errors):
                            is_duplicate = True
                        else:
                            err_msgs.append(f"{field}: {errors[0]}")
                            
                    if is_duplicate and not err_msgs:
                        duplicate_details.append(f"{airline} {flight_num} (Already exists)")
                    else:
                        err_str = ", ".join(err_msgs)
                        if is_duplicate:
                            duplicate_details.append(f"{airline} {flight_num} (Already exists & {err_str})")
                        else:
                            duplicate_details.append(f"{airline} {flight_num} ({err_str})")
            
            return Response({'created': created_data, 'duplicate_details': duplicate_details}, status=status.HTTP_201_CREATED)
        else:
            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

class AdminBookingListView(generics.ListAPIView):
    queryset = Booking.objects.all().order_by('-created_at')
    serializer_class = AdminBookingSerializer
    permission_classes = [IsAdminType]
    filter_backends = [filters.SearchFilter]
    search_fields = ['first_name', 'last_name', 'passenger_email', 'booking_id']

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        
        status_param = request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        # Calculate total revenue of all CONFIRMED bookings regardless of pagination
        from django.db.models import Sum, F, Q
        from decimal import Decimal
        
        # Calculate net revenue (price - refunded_amount) for the FILTERED queryset
        # Include CONFIRMED, REFUNDED, and REFUND_REQUESTED
        revenue_queryset = queryset.filter(status__in=['CONFIRMED', 'REFUNDED', 'REFUND_REQUESTED'])
        total_revenue = Decimal('0.00')
        
        for booking in revenue_queryset:
            # Fallback for old bookings that don't have charged_price set
            price_to_use = booking.charged_price if (booking.charged_price > 0 or booking.is_infant) else booking.flight.price
            net_amount = price_to_use - booking.refunded_amount
            total_revenue += net_amount

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response = self.get_paginated_response(serializer.data)
            response.data['total_revenue'] = total_revenue
            return response

        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'results': serializer.data,
            'total_revenue': total_revenue
        })

class AdminBookingDetailView(generics.RetrieveUpdateAPIView):
    queryset = Booking.objects.all()
    serializer_class = AdminBookingSerializer
    permission_classes = [IsAdminType]
    lookup_field = 'booking_id'

class AdminDashboardView(generics.GenericAPIView):
    permission_classes = [IsAdminType]

    def get(self, request):
        from django.db.models import Sum, Count, Q
        from django.utils import timezone
        from datetime import timedelta
        from decimal import Decimal
        
        # Calculate net revenue (price - refunded_amount) for CONFIRMED, REFUNDED, and REFUND_REQUESTED bookings
        confirmed_bookings = Booking.objects.filter(status__in=['CONFIRMED', 'REFUNDED', 'REFUND_REQUESTED'])
        total_revenue = Decimal('0.00')
        
        for booking in confirmed_bookings:
            price_to_use = booking.charged_price if (booking.charged_price > 0 or booking.is_infant) else booking.flight.price
            net_amount = price_to_use - booking.refunded_amount
            total_revenue += net_amount
        
        total_bookings = Booking.objects.count()

        # Update: Active bookings = Confirmed bookings for FUTURE flights
        active_bookings = Booking.objects.filter(
            status='CONFIRMED',
            flight__departure_time__gt=timezone.now()
        ).count()

        # Update: Total flights = FUTURE flights only
        total_flights = Flight.objects.filter(departure_time__gt=timezone.now()).count()
        
        recent_bookings = Booking.objects.order_by('-created_at')[:5]
        recent_bookings_data = BookingSerializer(recent_bookings, many=True).data

        pending_topups = TopUpRequest.objects.filter(status='PENDING').count()
        pending_refunds = Booking.objects.filter(status='REFUND_REQUESTED').count()
        
        # New Metrics for Analysis
        # 1. Revenue last 7 days (Daily)
        revenue_labels = []
        revenue_values = []
        today = timezone.now().date()
        for i in range(6, -1, -1):
            target_date = today - timedelta(days=i)
            day_bookings = Booking.objects.filter(
                status__in=['CONFIRMED', 'REFUNDED', 'REFUND_REQUESTED'],
                created_at__date=target_date
            )
            day_revenue = Decimal('0.00')
            for b in day_bookings:
                price = b.charged_price if (b.charged_price > 0 or b.is_infant) else b.flight.price
                day_revenue += (price - b.refunded_amount)
            
            revenue_labels.append(target_date.strftime('%b %d'))
            revenue_values.append(float(day_revenue))

        # 2. Booking Distribution
        status_counts = Booking.objects.values('status').annotate(count=Count('id'))
        
        # 3. User Stats
        total_users = User.objects.count()
        new_users_30d = User.objects.filter(date_joined__gte=timezone.now() - timedelta(days=30)).count()

        return Response({
            'total_revenue': total_revenue,
            'total_bookings': total_bookings,
            'active_bookings': active_bookings,
            'total_users': total_users - 1, # 1 is admin itself
            'total_flights': total_flights,
            'pending_topups': pending_topups,
            'pending_refunds': pending_refunds,
            'recent_bookings': recent_bookings_data,
            'revenue_chart': {
                'labels': revenue_labels,
                'values': revenue_values
            },
            'booking_distribution': {s['status']: s['count'] for s in status_counts},
            'new_users_30d': new_users_30d
        })

class AdminUserListView(generics.ListCreateAPIView):
    queryset = User.objects.filter(profile__usertype='user').order_by('-date_joined')
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminType]
    filter_backends = [filters.SearchFilter]
    search_fields = ['username', 'email', 'first_name', 'last_name']

class AdminUserDetailView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.all()
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminType]

class LoginView(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        email = request.data.get('email')
        password = request.data.get('password')
        
        if not email:
            # Fallback for username-based login if needed, but the requirement is email
            username = request.data.get('username')
            if username:
                username = username.lower()
                try:
                    user = User.objects.get(username=username)
                    email = user.email
                except User.DoesNotExist:
                    return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
            else:
                return Response({'error': 'Email and password are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        email = email # Preserve email case
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        # AuthTokenSerializer expects 'username' and 'password'
        serializer = self.serializer_class(data={'username': user.username, 'password': password}, 
                                         context={'request': request})
        
        if not serializer.is_valid():
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_400_BAD_REQUEST)
        
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        return Response({'token': token.key})


class WalletBalanceView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get(self, request, *args, **kwargs):
        user = request.user
        profile = user.profile
        recent_transactions = WalletTransaction.objects.filter(user=user).order_by('-timestamp')[:10]
        
        return Response({
            'wallet_balance': profile.wallet_balance,
            'credit_limit': profile.credit_limit,
            'total_dues': profile.total_dues,
            'available_spending_power': profile.wallet_balance + (profile.credit_limit - profile.total_dues),
            'recent_transactions': WalletTransactionSerializer(recent_transactions, many=True).data
        })

class UserTopUpRequestListView(generics.ListAPIView):
    serializer_class = TopUpRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return TopUpRequest.objects.filter(user=self.request.user).order_by('-created_at')

class AdminWalletTransactionListView(generics.ListAPIView):
    serializer_class = WalletTransactionSerializer
    permission_classes = [IsAdminType]

    def get_queryset(self):
        user_id = self.request.query_params.get('user_id')

        search = self.request.query_params.get('search')
        
        queryset = WalletTransaction.objects.all().order_by('-timestamp')
        
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        if search:
            queryset = queryset.filter(
                Q(description__icontains=search) | 
                Q(user__username__icontains=search) |
                Q(transaction_id__icontains=search)
            )
            
        return queryset

class WalletTopUpView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TopUpRequestSerializer

    def create(self, request, *args, **kwargs):
        amount = request.data.get('amount')
        try:
            amount = float(amount)
            if amount <= 0:
                raise ValueError
        except (TypeError, ValueError):
            return Response({'error': 'Invalid amount'}, status=status.HTTP_400_BAD_REQUEST)

        from decimal import Decimal
        amount = Decimal(str(amount))
        user = request.user
        
        # Check KYC status
        from .models import UserKYC
        try:
            kyc = user.kyc
            if kyc.kyc_status != 'VERIFIED':
                return Response({'error': 'KYC verification is required to top up your wallet.'}, status=status.HTTP_403_FORBIDDEN)
        except UserKYC.DoesNotExist:
            return Response({'error': 'KYC verification is required to top up your wallet.'}, status=status.HTTP_403_FORBIDDEN)
        
        user_remarks = request.data.get('remarks', '').strip() or None

        # Create a Top-up Request instead of immediate top-up
        topup_request = TopUpRequest.objects.create(
            user=user,
            amount=amount,
            status='PENDING',
            user_remarks=user_remarks,
        )

        return Response({
            'message': 'Top-up request submitted for admin approval',
            'request_id': topup_request.id,
            'amount': topup_request.amount,
            'status': topup_request.status
        }, status=status.HTTP_201_CREATED)

class RazorpayOrderView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        amount = request.data.get('amount')
        try:
            amount_decimal = Decimal(str(amount))
            if amount_decimal <= 0:
                raise ValueError
        except (TypeError, ValueError, InvalidOperation):
            return Response({'error': 'Invalid amount'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        # Check KYC status
        from .models import UserKYC
        try:
            kyc = user.kyc
            if kyc.kyc_status != 'VERIFIED':
                return Response({'error': 'KYC verification is required to top up your wallet.'}, status=status.HTTP_403_FORBIDDEN)
        except UserKYC.DoesNotExist:
            return Response({'error': 'KYC verification is required to top up your wallet.'}, status=status.HTTP_403_FORBIDDEN)

        client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
        
        # Razorpay amount is in paise
        razorpay_amount = int(amount_decimal * 100)
        
        try:
            razorpay_order = client.order.create({
                "amount": razorpay_amount,
                "currency": "INR",
                "payment_capture": "1",
                "notes": {
                    "description": f"{settings.BRAND_NAME} Wallet Top up : {request.user.username}"
                }
            })
            
            topup_request = TopUpRequest.objects.create(
                user=request.user,
                amount=amount_decimal,
                method='RAZORPAY',
                status='PENDING',
                razorpay_order_id=razorpay_order['id']
            )
            
            return Response({
                'order_id': razorpay_order['id'],
                'amount': razorpay_amount,
                'currency': 'INR',
                'key': settings.RAZORPAY_KEY_ID
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class RazorpayVerifyView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        razorpay_order_id = request.data.get('razorpay_order_id')
        razorpay_payment_id = request.data.get('razorpay_payment_id')
        razorpay_signature = request.data.get('razorpay_signature')

        if not all([razorpay_order_id, razorpay_payment_id, razorpay_signature]):
            return Response({'error': 'Missing payment credentials'}, status=status.HTTP_400_BAD_REQUEST)

        client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

        params_dict = {
            'razorpay_order_id': razorpay_order_id,
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_signature': razorpay_signature
        }

        try:
            client.utility.verify_payment_signature(params_dict)
            
            topup_request = get_object_or_404(TopUpRequest, razorpay_order_id=razorpay_order_id)
            if topup_request.status != 'PENDING':
                 return Response({'error': 'Request already processed'}, status=status.HTTP_400_BAD_REQUEST)

            topup_request.status = 'APPROVED'
            topup_request.razorpay_payment_id = razorpay_payment_id
            topup_request.razorpay_signature = razorpay_signature
            topup_request.save()

            # Credit Wallet
            user = topup_request.user
            profile = user.profile
            amount = topup_request.amount

            # Logic: Clear dues first
            dues_cleared = Decimal('0.00')
            wallet_added = Decimal('0.00')

            if profile.total_dues > 0:
                if amount >= profile.total_dues:
                    dues_cleared = profile.total_dues
                    remaining_amount = amount - profile.total_dues
                    profile.total_dues = Decimal('0.00')
                    profile.wallet_balance += remaining_amount
                    wallet_added = remaining_amount
                else:
                    dues_cleared = amount
                    profile.total_dues -= amount
                    wallet_added = Decimal('0.00')
            else:
                profile.wallet_balance += amount
                wallet_added = amount

            profile.save()

            # Create Transaction Record
            WalletTransaction.objects.create(
                user=user,
                amount=amount,
                transaction_type='CREDIT',
                description=f"Top-up of {amount}. Cleared dues: {dues_cleared}. Added to wallet: {wallet_added}.",
                transaction_id=razorpay_payment_id,
                balance_after=profile.wallet_balance,
                dues_after=profile.total_dues
            )

            return Response({'message': 'Payment verified and wallet credited', 'balance': profile.wallet_balance})
        except Exception as e:
            return Response({'error': 'Payment verification failed'}, status=status.HTTP_400_BAD_REQUEST)

class FlightRazorpayOrderView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        flight_id = request.data.get('flight')
        passengers = request.data.get('passengers', [])
        travel_date = request.data.get('travel_date')

        if not flight_id or not passengers:
            return Response({'error': 'Flight and passengers are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            flight = Flight.objects.get(id=flight_id)
        except Flight.DoesNotExist:
            return Response({'error': 'Flight not found'}, status=status.HTTP_404_NOT_FOUND)

        # KYC Verification Check
        from .models import UserKYC
        kyc, created = UserKYC.objects.get_or_create(user=request.user)
        if kyc.kyc_status != 'VERIFIED':
            return Response({
                'error': 'KYC Verification Required',
                'details': 'Please complete your KYC verification (Aadhar and PAN) to book flights.',
                'kyc_status': kyc.kyc_status
            }, status=status.HTTP_403_FORBIDDEN)

        # Calculate total cost
        total_cost = Decimal('0.00')
        for p in passengers:
            dob_str = p.get('date_of_birth')
            is_infant = False
            if dob_str:
                try:
                    y, m, d = map(int, dob_str.split('-'))
                    dob = date(y, m, d)
                    today = date.today()
                    age = today.year - dob.year - ((today.month, today.day) < (m, d))
                    if age <= 2:
                        is_infant = True
                except (ValueError, TypeError, AttributeError):
                    pass
            
            if is_infant:
                total_cost += flight.infant_price
            else:
                total_cost += flight.price

        total_cost = Decimal(str(total_cost))
        razorpay_amount = int(total_cost * 100) # In paise

        client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
        
        try:
            # Create a unique booking group ID to track this session
            booking_group = f"GRP-{uuid.uuid4().hex[:8].upper()}"
            
            razorpay_order = client.order.create({
                "amount": razorpay_amount,
                "currency": "INR",
                "payment_capture": "1",
                "notes": {
                    "description": f"Flight Booking: {flight.flight_number} for {request.user.username}",
                    "flight_id": flight_id,
                    "user_id": request.user.id,
                    "booking_group": booking_group,
                    "passengers_count": len(passengers)
                }
            })

            return Response({
                'order_id': razorpay_order['id'],
                'amount': razorpay_amount,
                'currency': 'INR',
                'key': settings.RAZORPAY_KEY_ID,
                'booking_group': booking_group
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class FlightRazorpayVerifyView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        razorpay_order_id = request.data.get('razorpay_order_id')
        razorpay_payment_id = request.data.get('razorpay_payment_id')
        razorpay_signature = request.data.get('razorpay_signature')
        
        # Original booking data to be processed upon verification
        flight_id = request.data.get('flight')
        passengers = request.data.get('passengers', [])
        travel_date = request.data.get('travel_date')

        if not all([razorpay_order_id, razorpay_payment_id, razorpay_signature]):
            return Response({'error': 'Missing payment credentials'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not flight_id or not passengers:
            return Response({'error': 'Booking data is missing'}, status=status.HTTP_400_BAD_REQUEST)

        client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

        params_dict = {
            'razorpay_order_id': razorpay_order_id,
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_signature': razorpay_signature
        }

        try:
            # 1. Verify Signature
            client.utility.verify_payment_signature(params_dict)
            
            # 2. Re-verify the order details for security
            razorpay_order = client.order.fetch(razorpay_order_id)
            notes = razorpay_order.get('notes', {})
            
            if str(notes.get('flight_id')) != str(flight_id):
                return Response({'error': 'Flight mismatch in payment'}, status=status.HTTP_400_BAD_REQUEST)
            
            # 3. Create Bookings
            try:
                flight = Flight.objects.get(id=flight_id)
            except Flight.DoesNotExist:
                return Response({'error': 'Flight not found'}, status=status.HTTP_404_NOT_FOUND)

            booking_group = notes.get('booking_group') or f"GRP-{uuid.uuid4().hex[:8].upper()}"
            pnr = flight.pnr
            
            from django.db import transaction
            with transaction.atomic():
                created_bookings = []
                for p_data in passengers:
                    booking_id = f"TNR-{uuid.uuid4().hex[:8].upper()}"
                    dob_str = p_data.get('date_of_birth')
                    is_infant_passenger = False
                    passenger_charged_price = flight.price
                    
                    if dob_str:
                        try:
                            # Handle both date objects and strings
                            if isinstance(dob_str, date):
                                dob = dob_str
                            else:
                                y, m, d = map(int, str(dob_str).split('-'))
                                dob = date(y, m, d)
                            
                            today = date.today()
                            age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
                            if age <= 2:
                                is_infant_passenger = True
                                passenger_charged_price = flight.infant_price
                        except:
                            pass

                    booking = Booking.objects.create(
                        flight=flight,
                        first_name=p_data.get('first_name', ''),
                        last_name=p_data.get('last_name', ''),
                        passenger_email=p_data.get('passenger_email'),
                        passenger_phone=p_data.get('passenger_phone'),
                        date_of_birth=p_data.get('date_of_birth'),
                        passport_number=p_data.get('passport_number'),
                        passport_issue_date=p_data.get('passport_issue_date'),
                        passport_expiry_date=p_data.get('passport_expiry_date'),
                        frequent_flyer_number=p_data.get('frequent_flyer_number'),
                        travel_date=travel_date,
                        booking_id=booking_id,
                        booked_by=request.user,
                        booking_group=booking_group,
                        pnr=pnr,
                        payment_mode='RAZORPAY',
                        is_infant=is_infant_passenger,
                        charged_price=passenger_charged_price,
                        status='CONFIRMED',
                        razorpay_order_id=razorpay_order_id,
                        razorpay_payment_id=razorpay_payment_id,
                        razorpay_signature=razorpay_signature
                    )
                    created_bookings.append(booking)

            # 4. Create WalletTransaction for bookkeeping
            try:
                from .models import WalletTransaction, UserProfile
                profile = UserProfile.objects.get(user=request.user)
                total_paid = Decimal(str(razorpay_order.get('amount', 0) / 100))
                
                WalletTransaction.objects.create(
                    user=request.user,
                    amount=total_paid,
                    transaction_type='DEBIT',
                    description=f"Instant Flight Booking (Razorpay): {flight.flight_number} for {len(passengers)} passenger(s)",
                    transaction_id=razorpay_payment_id,
                    balance_after=profile.wallet_balance,
                    dues_after=profile.total_dues
                )
            except Exception as tx_err:
                # Log error but don't fail the response since booking is already confirmed
                print(f"Failed to create WalletTransaction for Razorpay booking: {tx_err}")

            return Response({
                'message': 'Payment verified and booking confirmed',
                'booking_group': booking_group
            })
        except Exception as e:
            return Response({'error': f'Payment verification or booking creation failed: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

class AdminTopUpRequestListView(generics.ListAPIView):
    queryset = TopUpRequest.objects.all().order_by('-created_at')
    serializer_class = TopUpRequestSerializer
    permission_classes = [IsAdminType]
    filter_backends = [filters.SearchFilter]
    search_fields = ['user__username', 'user__email']

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        status_param = request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

class AdminTopUpRequestActionView(generics.GenericAPIView):
    permission_classes = [IsAdminType]

    def post(self, request):
        request_id = request.data.get('request_id')
        action = request.data.get('action') # 'APPROVE' or 'REJECT'
        remarks = request.data.get('remarks', '').strip()

        if not request_id or not action:
            return Response({'error': 'Request ID and action are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            topup_request = TopUpRequest.objects.get(id=request_id)
        except TopUpRequest.DoesNotExist:
            return Response({'error': 'Top-up request not found'}, status=status.HTTP_404_NOT_FOUND)

        if topup_request.status != 'PENDING':
            return Response({'error': 'This request has already been processed'}, status=status.HTTP_400_BAD_REQUEST)

        user = topup_request.user
        profile = user.profile
        from decimal import Decimal

        if action == 'APPROVE':
            topup_request.status = 'APPROVED'
            amount = topup_request.amount
            
            # Logic: Clear dues first (copied from original WalletTopUpView)
            dues_cleared = Decimal('0.00')
            wallet_added = Decimal('0.00')

            if profile.total_dues > 0:
                if amount >= profile.total_dues:
                    dues_cleared = profile.total_dues
                    remaining_amount = amount - profile.total_dues
                    profile.total_dues = Decimal('0.00')
                    profile.wallet_balance += remaining_amount
                    wallet_added = remaining_amount
                else:
                    dues_cleared = amount
                    profile.total_dues -= amount
                    wallet_added = Decimal('0.00')
            else:
                profile.wallet_balance += amount
                wallet_added = amount

            profile.save()

            # Create Transaction Record
            WalletTransaction.objects.create(
                user=user,
                amount=amount,
                transaction_type='CREDIT',
                description=f"Top-up of {amount} (Approved). Cleared dues: {dues_cleared}. Added to wallet: {wallet_added}.",
                balance_after=profile.wallet_balance,
                dues_after=profile.total_dues
            )
        elif action == 'REJECT':
            topup_request.status = 'REJECTED'
        else:
            return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)

        if remarks:
            topup_request.remarks = remarks
        topup_request.save()

        return Response({
            'message': f'Top-up request {action.lower()}d successfully',
            'status': topup_request.status,
            'wallet_balance': profile.wallet_balance if action == 'APPROVE' else None
        })

class AdminWalletUpdateView(generics.UpdateAPIView):
    permission_classes = [IsAdminType]
    serializer_class = AdminUserSerializer
    queryset = User.objects.all()

    def update(self, request, *args, **kwargs):
        user = self.get_object()
        profile = user.profile
        
        from decimal import Decimal
        old_balance = profile.wallet_balance
        old_limit = profile.credit_limit
        old_dues = profile.total_dues
        
        # Current working values
        curr_balance = old_balance
        curr_limit = old_limit
        curr_dues = old_dues
        
        any_change = False
        admin_remarks = request.data.get('remarks', '').strip() or None

        # 1. Credit Limit
        credit_limit = request.data.get('credit_limit')
        if credit_limit is not None:
            new_limit = Decimal(str(credit_limit))
            if new_limit != old_limit:
                diff = new_limit - old_limit
                curr_limit = new_limit
                WalletTransaction.objects.create(
                    user=user,
                    amount=abs(diff),
                    transaction_type='CREDIT' if diff >= 0 else 'DEBIT',
                    description=f"Admin Adjustment: Credit limit from {old_limit} to {new_limit}",
                    remarks=admin_remarks,
                    balance_after=curr_balance,
                    dues_after=curr_dues
                )
                any_change = True

        # 2. Wallet Balance
        wallet_balance = request.data.get('wallet_balance')
        if wallet_balance is not None:
            new_balance = Decimal(str(wallet_balance))
            if new_balance != old_balance:
                diff = new_balance - old_balance
                curr_balance = new_balance
                WalletTransaction.objects.create(
                    user=user,
                    amount=abs(diff),
                    transaction_type='CREDIT' if diff >= 0 else 'DEBIT',
                    description=f"Admin Adjustment: Wallet balance from {old_balance} to {new_balance}",
                    remarks=admin_remarks,
                    balance_after=curr_balance,
                    dues_after=curr_dues
                )
                any_change = True

        # 3. Total Dues
        total_dues = request.data.get('total_dues')
        if total_dues is not None:
            new_dues = Decimal(str(total_dues))
            if new_dues != old_dues:
                diff = new_dues - old_dues
                curr_dues = new_dues
                # Note: Increase in dues is a DEBIT to spending power
                WalletTransaction.objects.create(
                    user=user,
                    amount=abs(diff),
                    transaction_type='DEBIT' if diff >= 0 else 'CREDIT',
                    description=f"Admin Adjustment: Total dues from {old_dues} to {new_dues}",
                    remarks=admin_remarks,
                    balance_after=curr_balance,
                    dues_after=curr_dues
                )
                any_change = True

        if any_change:
            profile.credit_limit = curr_limit
            profile.wallet_balance = curr_balance
            profile.total_dues = curr_dues
            profile.save()
            
        return Response({
            'message': 'Wallet updated successfully',
            'wallet_balance': profile.wallet_balance,
            'credit_limit': profile.credit_limit,
            'total_dues': profile.total_dues
        })

class RefundRequestView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        booking_id = request.data.get('booking_id')
        booking_group = request.data.get('booking_group')
        booking_ids = request.data.get('booking_ids')  # list of specific passenger booking IDs

        if not booking_id and not booking_group and not booking_ids:
            return Response({'error': 'Booking ID, Booking Group, or Booking IDs list required'}, status=status.HTTP_400_BAD_REQUEST)

        if booking_ids:
            if not isinstance(booking_ids, list) or len(booking_ids) == 0:
                return Response({'error': 'booking_ids must be a non-empty list'}, status=status.HTTP_400_BAD_REQUEST)
            bookings = Booking.objects.filter(booking_id__in=booking_ids, booked_by=request.user)
        elif booking_group:
            bookings = Booking.objects.filter(booking_group=booking_group, booked_by=request.user)
        else:
            bookings = Booking.objects.filter(booking_id=booking_id, booked_by=request.user)

        if not bookings.exists():
            return Response({'error': 'No matching bookings found'}, status=status.HTTP_404_NOT_FOUND)

        eligible_bookings = bookings.filter(status='CONFIRMED')
        if not eligible_bookings.exists():
            # Check if they are already requested
            if bookings.filter(status='REFUND_REQUESTED').exists():
                 return Response({'error': 'Refund already requested for this group/booking'}, status=status.HTTP_400_BAD_REQUEST)
            return Response({'error': 'No confirmed bookings found to refund'}, status=status.HTTP_400_BAD_REQUEST)

        user_remarks = request.data.get('remarks', '').strip()
        for b in eligible_bookings:
            b.status = 'REFUND_REQUESTED'
            b.user_refund_remarks = user_remarks or None
            b.admin_refund_remarks = None  # clear any previous admin remark
            b.save(update_fields=['status', 'user_refund_remarks', 'admin_refund_remarks'])

        count = eligible_bookings.count()

        return Response({
            'message': f'Refund requested successfully for {count} passenger(s)',
            'count': count
        })

class AdminCancelRefundView(generics.GenericAPIView):
    permission_classes = [IsAdminType]

    def post(self, request):
        booking_id = request.data.get('booking_id')
        booking_group = request.data.get('booking_group')
        admin_remarks = request.data.get('admin_remarks', '').strip()

        if not booking_id and not booking_group:
            return Response({'error': 'Booking ID or Booking Group required'}, status=status.HTTP_400_BAD_REQUEST)

        if booking_group:
            bookings = Booking.objects.filter(booking_group=booking_group, status='REFUND_REQUESTED')
        else:
            bookings = Booking.objects.filter(booking_id=booking_id, status='REFUND_REQUESTED')

        if not bookings.exists():
            return Response({'error': 'No active refund requests found'}, status=status.HTTP_404_NOT_FOUND)

        for b in bookings:
            b.status = 'CONFIRMED'
            b.admin_refund_remarks = admin_remarks or None
            b.save(update_fields=['status', 'admin_refund_remarks'])

        count = bookings.count()

        return Response({
            'message': f'Refund request(s) denied successfully for {count} passenger(s)',
            'count': count
        })

class RefundProcessView(generics.GenericAPIView):
    permission_classes = [IsAdminType]
    
    def post(self, request):
        booking_id = request.data.get('booking_id')
        booking_group = request.data.get('booking_group')
        total_refund_amount = request.data.get('amount')
        admin_remarks = request.data.get('admin_remarks', '').strip()

        if (not booking_id and not booking_group) or total_refund_amount is None:
            return Response({'error': 'Booking ID/Group and amount required'}, status=status.HTTP_400_BAD_REQUEST)
            
        if booking_group:
            bookings = Booking.objects.filter(booking_group=booking_group).exclude(status__in=['REFUNDED', 'REJECTED'])
        else:
            bookings = Booking.objects.filter(booking_id=booking_id).exclude(status__in=['REFUNDED', 'REJECTED'])
            
        if not bookings.exists():
            return Response({'error': 'No eligible bookings found for refund'}, status=status.HTTP_404_NOT_FOUND)

        from decimal import Decimal
        try:
            total_refund_amount = Decimal(str(total_refund_amount))
        except:
             return Response({'error': 'Invalid amount format'}, status=status.HTTP_400_BAD_REQUEST)
             
        if total_refund_amount < 0:
            return Response({'error': 'Refund amount cannot be negative'}, status=status.HTTP_400_BAD_REQUEST)

        # Calculate Total Cost of selected bookings
        total_group_cost = Decimal('0.00')
        individual_costs = []
        for b in bookings:
            cost = b.charged_price if (b.charged_price > 0 or b.is_infant) else b.flight.price
            total_group_cost += cost
            individual_costs.append({'booking': b, 'cost': cost})

        if total_refund_amount > total_group_cost:
            return Response({
                'error': f'Refund amount ({total_refund_amount}) cannot exceed total cost ({total_group_cost})'
            }, status=status.HTTP_400_BAD_REQUEST)

        # All bookings in a group should ideally belong to the same user who booked them
        # We take the user from the first booking
        main_booking = bookings.first()
        user = main_booking.booked_by
        if not user:
             return Response({'error': 'No user associated with this booking'}, status=status.HTTP_400_BAD_REQUEST)
             
        # Atomic Transaction for Database Consistency
        from django.db import transaction
        with transaction.atomic():
            # Logic: Clear dues first
            dues_cleared = Decimal('0.00')
            wallet_added = Decimal('0.00')

            # Re-fetch profile to prevent race conditions
            profile = user.profile

            if profile.total_dues > 0:
                if total_refund_amount >= profile.total_dues:
                    dues_cleared = profile.total_dues
                    remaining_amount = total_refund_amount - profile.total_dues
                    profile.total_dues = Decimal('0.00')
                    profile.wallet_balance += remaining_amount
                    wallet_added = remaining_amount
                else:
                    dues_cleared = total_refund_amount
                    profile.total_dues -= total_refund_amount
                    wallet_added = Decimal('0.00')
            else:
                profile.wallet_balance += total_refund_amount
                wallet_added = total_refund_amount

            profile.save()
            
            # Distribute refund amount proportionally across passengers
            remaining_to_distribute = total_refund_amount
            for i, item in enumerate(individual_costs):
                b = item['booking']
                cost = item['cost']
                
                if i == len(individual_costs) - 1:
                    # Last passenger gets the remainder to avoid rounding issues
                    p_refund = remaining_to_distribute
                else:
                    if total_group_cost > 0:
                        p_refund = (total_refund_amount * cost / total_group_cost).quantize(Decimal('0.01'))
                    else:
                        p_refund = Decimal('0.00')
                    remaining_to_distribute -= p_refund

                b.refunded_amount = p_refund
                b.status = 'REFUNDED'
                b.admin_refund_remarks = admin_remarks or None
                b.save()
            
            # Create a single transaction log for auditing
            from .models import WalletTransaction
            WalletTransaction.objects.create(
                user=user,
                amount=total_refund_amount,
                transaction_type='CREDIT',
                description=f"Refunded {bookings.count()} booking(s). Cleared dues: {dues_cleared}. Added to wallet: {wallet_added}.",
                balance_after=profile.wallet_balance,
                dues_after=profile.total_dues
            )
        
        return Response({
            'message': f'Successfully refunded {bookings.count()} booking(s)', 
            'total_refunded': total_refund_amount,
            'processed_count': bookings.count()
        })

class AdminBookingRejectView(generics.GenericAPIView):
    permission_classes = [IsAdminType]
    
    def post(self, request):
        booking_id = request.data.get('booking_id')
        booking_group = request.data.get('booking_group')
        
        if not booking_id and not booking_group:
            return Response({'error': 'Booking ID or Booking Group required'}, status=status.HTTP_400_BAD_REQUEST)
            
        if booking_group:
            bookings = Booking.objects.filter(booking_group=booking_group).exclude(status__in=['REJECTED', 'CANCELLED', 'REFUNDED'])
            if not bookings.exists():
                return Response({'error': 'No eligible bookings found in this group'}, status=status.HTTP_404_NOT_FOUND)
        else:
            try:
                bookings = [Booking.objects.get(booking_id=booking_id)]
                if bookings[0].status in ['REJECTED', 'CANCELLED', 'REFUNDED']:
                    return Response({'error': f'Booking already {bookings[0].status.lower()}'}, status=status.HTTP_400_BAD_REQUEST)
            except Booking.DoesNotExist:
                return Response({'error': 'Booking not found'}, status=status.HTTP_404_NOT_FOUND)

        from decimal import Decimal
        total_refunded = Decimal('0.00')
        processed_count = 0

        for booking in bookings:
            # Credit User Wallet (Full Refund)
            user = booking.booked_by
            if not user:
                 continue
                 
            profile = user.profile
            
            # Use charged_price (what was actually paid at booking)
            refund_amount = booking.charged_price if (booking.charged_price > 0 or booking.is_infant) else booking.flight.price

            # Logic: Clear dues first
            dues_cleared = Decimal('0.00')
            wallet_added = Decimal('0.00')

            if profile.total_dues > 0:
                if refund_amount >= profile.total_dues:
                    dues_cleared = profile.total_dues
                    remaining_amount = refund_amount - profile.total_dues
                    profile.total_dues = Decimal('0.00')
                    profile.wallet_balance += remaining_amount
                    wallet_added = remaining_amount
                else:
                    dues_cleared = refund_amount
                    profile.total_dues -= refund_amount
                    wallet_added = Decimal('0.00')
            else:
                profile.wallet_balance += refund_amount
                wallet_added = refund_amount

            profile.save()
            
            # Update Booking Status and Refunded Amount
            booking.refunded_amount = refund_amount
            booking.status = 'REJECTED'
            booking.save()
            
            # Create Transaction
            WalletTransaction.objects.create(
                user=user,
                amount=refund_amount,
                transaction_type='CREDIT',
                description=f"Refund for REJECTED booking {booking.booking_id}. Cleared dues: {dues_cleared}. Added to wallet: {wallet_added}.",
                balance_after=profile.wallet_balance,
                dues_after=profile.total_dues
            )
            
            total_refunded += refund_amount
            processed_count += 1
        
        return Response({
            'message': f'Successfully rejected {processed_count} booking(s)', 
            'total_refunded': total_refunded,
            'processed_count': processed_count
        })



class AdminContactMessageListView(generics.ListAPIView):
    queryset = ContactMessage.objects.all().order_by('-created_at')
    serializer_class = ContactMessageSerializer
    permission_classes = [IsAdminType]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'email', 'message']

class SubmitKYCView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserProfileSerializer

    def get_object(self):
        from .models import UserKYC
        kyc, created = UserKYC.objects.get_or_create(user=self.request.user)
        return kyc

    def update(self, request, *args, **kwargs):
        kyc = self.get_object()
        
        # Mandatory fields check
        required_fields = ['aadhar_number', 'pan_number', 'gst_number']
        required_files = ['brand_logo', 'aadhar_card_doc', 'pan_card_doc']
        
        errors = {}
        for field in required_fields:
            if not request.data.get(field):
                errors[field] = ["This field is required."]
        
        for file_field in required_files:
            if not request.FILES.get(file_field) and not getattr(kyc, f"{file_field}_data"):
                errors[file_field] = ["Document upload is required."]
        
        if errors:
            return Response({'error': 'Missing mandatory KYC data', 'details': errors}, status=status.HTTP_400_BAD_REQUEST)

        # We pass request data to the serializer
        # Note: we need to update the serializer to handle UserKYC mapping
        # For now, we'll manually handle the binary fields here as a fallback if serializer isn't ready
        if request.FILES:
            for file_key in ['brand_logo', 'aadhar_card_doc', 'pan_card_doc']:
                uploaded_file = request.FILES.get(file_key)
                if uploaded_file:
                    setattr(kyc, f"{file_key}_data", uploaded_file.read())
                    setattr(kyc, f"{file_key}_name", uploaded_file.name)
                    setattr(kyc, f"{file_key}_mimetype", uploaded_file.content_type)

        kyc.aadhar_number = request.data.get('aadhar_number', kyc.aadhar_number)
        kyc.pan_number = request.data.get('pan_number', kyc.pan_number)
        kyc.gst_number = request.data.get('gst_number', kyc.gst_number)
        kyc.kyc_status = 'SUBMITTED'
        kyc.save()

        return Response({
            'message': 'KYC submitted successfully',
            'kyc_status': 'SUBMITTED'
        })

class AdminKYCListView(generics.ListAPIView):
    queryset = User.objects.filter(kyc__kyc_status__in=['SUBMITTED', 'VERIFIED', 'REJECTED']).order_by('-date_joined')
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminType]
    filter_backends = [filters.SearchFilter]
    search_fields = ['username', 'email', 'kyc__aadhar_number', 'kyc__pan_number']

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        status_param = request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(kyc__kyc_status=status_param)
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

class AdminKYCActionView(generics.GenericAPIView):
    permission_classes = [IsAdminType]

    def post(self, request):
        user_id = request.data.get('user_id')
        action = request.data.get('action') # 'APPROVE' or 'REJECT'
        
        if not user_id or not action:
            return Response({'error': 'User ID and action are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from .models import UserKYC
            user = User.objects.get(id=user_id)
            kyc, created = UserKYC.objects.get_or_create(user=user)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        if action == 'APPROVE':
            kyc.kyc_status = 'VERIFIED'
        elif action == 'REJECT':
            kyc.kyc_status = 'REJECTED'
        else:
            return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)

        kyc.save()
        return Response({
            'message': f'KYC {action.lower()}d successfully',
            'kyc_status': kyc.kyc_status
        })

class QueryParamsTokenAuthentication(TokenAuthentication):
    def authenticate(self, request):
        token = request.query_params.get('token')
        if token:
            return self.authenticate_credentials(token)
        return super().authenticate(request)

class ServeKYCDocumentView(generics.GenericAPIView):
    authentication_classes = [QueryParamsTokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, doc_type, user_id):
        """
        Serves the binary content of a KYC document from the database.
        """
        # Allow only the owner or an admin to access
        is_admin = request.user.is_staff or request.user.is_superuser or (hasattr(request.user, 'profile') and request.user.profile.usertype in ['admin', 'superadmin'])
        if not is_admin and request.user.id != int(user_id):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        user = get_object_or_404(User, id=user_id)
        from .models import UserKYC
        kyc, created = UserKYC.objects.get_or_create(user=user)

        if doc_type == 'brand_logo':
            data = kyc.brand_logo_data
            name = kyc.brand_logo_name
            mimetype = kyc.brand_logo_mimetype
        elif doc_type == 'aadhar':
            data = kyc.aadhar_card_doc_data
            name = kyc.aadhar_card_doc_name
            mimetype = kyc.aadhar_card_doc_mimetype
        elif doc_type == 'pan':
            data = kyc.pan_card_doc_data
            name = kyc.pan_card_doc_name
            mimetype = kyc.pan_card_doc_mimetype
        else:
            raise Http404("Document type not found")

        if not data:
            raise Http404(f"Document {doc_type} content not found for this user")

        response = HttpResponse(data, content_type=mimetype)
        # Suggest filename for browser
        response['Content-Disposition'] = f'inline; filename="{name or (doc_type + ".png")}"'
        return response
        
@api_view(['POST'])
@permission_classes([AllowAny])
def check_email(request):
    email = request.data.get('email')
    username = request.data.get('username')
    
    if not email and not username:
        return Response({'error': 'Email or username is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    response_data = {
        'exists': False,
        'email_exists': False,
        'username_exists': False
    }
    
    if email:
        email_exists = User.objects.filter(email=email).exists()
        response_data['email_exists'] = email_exists
        response_data['exists'] = email_exists
        
    if username:
        username_exists = User.objects.filter(username=username).exists()
        response_data['username_exists'] = username_exists
        # If only username is provided, 'exists' reflects username availability
        if not email:
            response_data['exists'] = username_exists
            
    return Response(response_data, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    email = request.data.get('email')
    new_password = request.data.get('password')
    
    if not email or not new_password:
        return Response({'error': 'Email and new password are required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(email=email)
        user.set_password(new_password)
        user.save()
        return Response({'message': 'Password reset successfully'}, status=status.HTTP_200_OK)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

from rest_framework import viewsets

class FlyerViewSet(viewsets.ModelViewSet):
    queryset = Flyer.objects.all().order_by('-created_at')
    serializer_class = FlyerSerializer
    permission_classes = [IsAdminType]

    def perform_create(self, serializer):
        image_file = self.request.FILES.get('image')
        if image_file:
            serializer.save(
                image_data=image_file.read(),
                image_name=image_file.name,
                image_mimetype=image_file.content_type
            )
        else:
            serializer.save()

    def perform_update(self, serializer):
        image_file = self.request.FILES.get('image')
        if image_file:
            serializer.save(
                image_data=image_file.read(),
                image_name=image_file.name,
                image_mimetype=image_file.content_type
            )
        else:
            serializer.save()

class PublicFlyerListView(generics.ListAPIView):
    queryset = Flyer.objects.filter(is_active=True).order_by('-created_at')
    serializer_class = FlyerSerializer
    permission_classes = [AllowAny]

@api_view(['GET'])
@permission_classes([AllowAny])
def serve_flyer_image(request, pk):
    flyer = get_object_or_404(Flyer, pk=pk)
    if not flyer.image_data:
        raise Http404('Image not found')
    
    response = HttpResponse(flyer.image_data, content_type=flyer.image_mimetype or 'image/jpeg')
    response['Cache-Control'] = 'public, max-age=86400'
    return response
