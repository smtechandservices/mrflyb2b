from rest_framework import serializers
from django.conf import settings
from django.contrib.auth.models import User
from .models import Flight, Booking, ContactMessage, UserProfile, WalletTransaction, TopUpRequest, UserKYC, Flyer

class UserKYCSerializer(serializers.ModelSerializer):
    brand_logo = serializers.SerializerMethodField()
    aadhar_card_doc = serializers.SerializerMethodField()
    pan_card_doc = serializers.SerializerMethodField()

    class Meta:
        model = UserKYC
        fields = ('aadhar_number', 'pan_number', 'gst_number', 'brand_logo', 'aadhar_card_doc', 'pan_card_doc', 'kyc_status')

    def get_brand_logo(self, obj):
        return self._get_doc_url(obj, 'brand_logo')

    def get_aadhar_card_doc(self, obj):
        return self._get_doc_url(obj, 'aadhar')

    def get_pan_card_doc(self, obj):
        return self._get_doc_url(obj, 'pan')

    def _get_doc_url(self, obj, doc_type):
        request = self.context.get('request')
        has_data = False
        if doc_type == 'brand_logo': has_data = bool(obj.brand_logo_data)
        elif doc_type == 'aadhar': has_data = bool(obj.aadhar_card_doc_data)
        elif doc_type == 'pan': has_data = bool(obj.pan_card_doc_data)

        if has_data:
            from django.urls import reverse
            url = reverse('serve-kyc-doc', kwargs={'doc_type': doc_type, 'user_id': obj.user.id})
            if request:
                absolute_uri = request.build_absolute_uri(url)
                # If the request is over HTTPS or behind an HTTPS proxy, ensure the URL uses https
                if request.is_secure() or request.META.get('HTTP_X_FORWARDED_PROTO') == 'https' or settings.BRAND_DOMAIN in request.get_host():
                    return absolute_uri.replace('http://', 'https://')
                return absolute_uri
            return url
        return None

class UserProfileSerializer(serializers.ModelSerializer):
    # Map KYC fields for frontend compatibility
    aadhar_number = serializers.CharField(source='user.kyc.aadhar_number', read_only=True)
    pan_number = serializers.CharField(source='user.kyc.pan_number', read_only=True)
    gst_number = serializers.CharField(source='user.kyc.gst_number', read_only=True)
    kyc_status = serializers.CharField(source='user.kyc.kyc_status', read_only=True)
    
    brand_logo = serializers.SerializerMethodField()
    aadhar_card_doc = serializers.SerializerMethodField()
    pan_card_doc = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = ('phone_number', 'address', 'usertype', 'wallet_balance', 'credit_limit', 'total_dues', 
                 'aadhar_number', 'pan_number', 'gst_number', 'brand_logo', 'aadhar_card_doc', 'pan_card_doc', 'kyc_status')
        read_only_fields = ('wallet_balance', 'credit_limit', 'total_dues', 'kyc_status')

    def _get_kyc_obj(self, obj):
        return getattr(obj.user, 'kyc', None)

    def get_brand_logo(self, obj):
        kyc = self._get_kyc_obj(obj)
        if not kyc: return None
        return UserKYCSerializer(context=self.context).get_brand_logo(kyc)

    def get_aadhar_card_doc(self, obj):
        kyc = self._get_kyc_obj(obj)
        if not kyc: return None
        return UserKYCSerializer(context=self.context).get_aadhar_card_doc(kyc)

    def get_pan_card_doc(self, obj):
        kyc = self._get_kyc_obj(obj)
        if not kyc: return None
        return UserKYCSerializer(context=self.context).get_pan_card_doc(kyc)

    def update(self, instance, validated_data):
        # Handle user profile updates as usual
        return super().update(instance, validated_data)

class WalletTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WalletTransaction
        fields = '__all__'

class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    phone_number = serializers.CharField(source='profile.phone_number', required=False, allow_blank=True)
    address = serializers.CharField(source='profile.address', required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'profile', 'phone_number', 'address', 'is_staff', 'is_superuser')

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', None)
        
        # Update User fields (username, etc.)
        for attr, value in validated_data.items():
            if attr == 'username':
                value = value.lower()
            setattr(instance, attr, value)
        instance.save()

        # Update Profile fields
        if profile_data:
            profile = instance.profile
            for attr, value in profile_data.items():
                setattr(profile, attr, value)
            profile.save()
            
        return instance

class RegisterSerializer(serializers.ModelSerializer):
    username = serializers.CharField(required=False, allow_blank=True)
    phone_number = serializers.CharField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)


    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'phone_number', 'address')
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        profile_data = {
            'phone_number': validated_data.pop('phone_number', ''),
            'address': validated_data.pop('address', '')
        }
        # Use email as username for strictly email-based system, always lowercase
        email = validated_data['email'] # Keep email case as provided
        username = (validated_data.get('username') or email).lower()
        
        user = User.objects.create_user(
            username,
            email,
            validated_data['password']
        )
        UserProfile.objects.create(user=user, **profile_data)
        return user


class FlightSerializer(serializers.ModelSerializer):
    available_seats = serializers.SerializerMethodField()
    duration = serializers.DurationField(required=False)

    class Meta:
        model = Flight
        fields = '__all__'

    def validate_airline(self, value):
        if value:
            return value.upper()
        return value

    def validate_flight_number(self, value):
        if value:
            import re
            if re.search(r'[\s\-]', value):
                raise serializers.ValidationError("Flight number must not contain spaces or hyphens.")
            return value.upper()
        return value

    def validate_origin(self, value):
        if value:
            value = value.strip().upper()
            if len(value) != 3 or not value.isalpha():
                raise serializers.ValidationError("Origin must be exactly 3 letters (e.g., DEL).")
        return value

    def validate_destination(self, value):
        if value:
            value = value.strip().upper()
            if len(value) != 3 or not value.isalpha():
                raise serializers.ValidationError("Destination must be exactly 3 letters (e.g., BOM).")
        return value

    def get_available_seats(self, obj):
        from django.db.models import Q
        booked_filter = Q(status='CONFIRMED') | Q(status='PENDING')
        if hasattr(obj, 'booked_seats_count'):
            booked = obj.booked_seats_count
        else:
            booked = obj.bookings.filter(booked_filter).count()
        return max(0, obj.total_seats - booked)

    def validate(self, attrs):
        departure_time = attrs.get('departure_time')
        arrival_time = attrs.get('arrival_time')

        if departure_time and arrival_time:
            diff = arrival_time - departure_time
            if diff.total_seconds() <= 0:
                raise serializers.ValidationError({"arrival_time": "Arrival time must be strictly after departure time."})
            attrs['duration'] = diff

        # Sync stop_info (itinerary) if it exists to maintain data consistency
        stop_info = attrs.get('stop_info') or (self.instance.stop_info if self.instance else None)
        if stop_info:
            try:
                import json
                legs = json.loads(stop_info)
                if isinstance(legs, list) and len(legs) > 0:
                    # Sync Leg 1 (Departure)
                    legs[0]['airline'] = attrs.get('airline') or (self.instance.airline if self.instance else legs[0].get('airline'))
                    legs[0]['flight_number'] = attrs.get('flight_number') or (self.instance.flight_number if self.instance else legs[0].get('flight_number'))
                    legs[0]['origin'] = attrs.get('origin') or (self.instance.origin if self.instance else legs[0].get('origin'))
                    legs[0]['departure_terminal'] = attrs.get('departure_terminal') or (self.instance.departure_terminal if self.instance else legs[0].get('departure_terminal'))
                    
                    dep_dt = attrs.get('departure_time') or (self.instance.departure_time if self.instance else None)
                    if dep_dt:
                        legs[0]['departure_time'] = dep_dt.isoformat().replace('+00:00', 'Z')
                        legs[0]['date_departure'] = dep_dt.strftime('%d/%m/%Y')
                        legs[0]['time_departure'] = dep_dt.strftime('%H:%M')

                    # Sync Last Leg (Arrival)
                    last_idx = len(legs) - 1
                    legs[last_idx]['destination'] = attrs.get('destination') or (self.instance.destination if self.instance else legs[last_idx].get('destination'))
                    legs[last_idx]['arrival_terminal'] = attrs.get('arrival_terminal') or (self.instance.arrival_terminal if self.instance else legs[last_idx].get('arrival_terminal'))
                    
                    arr_dt = attrs.get('arrival_time') or (self.instance.arrival_time if self.instance else None)
                    if arr_dt:
                        legs[last_idx]['arrival_time'] = arr_dt.isoformat().replace('+00:00', 'Z')
                        legs[last_idx]['date_arrival'] = arr_dt.strftime('%d/%m/%Y')
                        legs[last_idx]['time_arrival'] = arr_dt.strftime('%H:%M')

                    attrs['stop_info'] = json.dumps(legs)
            except Exception:
                pass

        if not self.instance:
            flight_number = attrs.get('flight_number')
            departure_time = attrs.get('departure_time')
            airline = attrs.get('airline')
            origin = attrs.get('origin')
            destination = attrs.get('destination')

            if all([flight_number, departure_time, airline, origin, destination]):
                # Check for existing flight with exact same details
                from .models import Flight
                if Flight.objects.filter(
                    flight_number=flight_number,
                    departure_time=departure_time,
                    airline=airline,
                    origin=origin,
                    destination=destination
                ).exists():
                    raise serializers.ValidationError("A flight with these exact details already exists.")
        
        return attrs

class BookingSerializer(serializers.ModelSerializer):
    flight_details = FlightSerializer(source='flight', read_only=True)
    payment_status = serializers.SerializerMethodField()
    flight_status = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = '__all__'
        read_only_fields = ('booking_id', 'status', 'created_at', 'booked_by', 'booking_group', 'pnr', 'payment_mode', 'is_infant', 'charged_price')

    def get_payment_status(self, obj):
        """User-facing payment/booking state."""
        mapping = {
            'CONFIRMED': 'CONFIRMED',
            'PENDING': 'PENDING',
            'CANCELLED': 'CANCELLED',
            'REJECTED': 'REJECTED',
            'REFUND_REQUESTED': 'REFUND REQUESTED',
            'REFUNDED': 'REFUNDED',
        }
        return mapping.get(obj.status, obj.status)

    def get_flight_status(self, obj):
        """Whether the airline has assigned a PNR."""
        return 'CONFIRMED' if obj.pnr else 'PENDING'

class AdminBookingSerializer(serializers.ModelSerializer):
    flight_details = FlightSerializer(source='flight', read_only=True)
    booked_by = UserSerializer(read_only=True)
    payment_status = serializers.SerializerMethodField()
    flight_status = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = '__all__'
        read_only_fields = ('booking_id', 'created_at', 'booked_by', 'booking_group', 'payment_mode')

    def get_payment_status(self, obj):
        """User-facing payment/booking state."""
        mapping = {
            'CONFIRMED': 'CONFIRMED',
            'PENDING': 'PENDING',
            'CANCELLED': 'CANCELLED',
            'REJECTED': 'REJECTED',
            'REFUND_REQUESTED': 'REFUND REQUESTED',
            'REFUNDED': 'REFUNDED',
        }
        return mapping.get(obj.status, obj.status)

    def get_flight_status(self, obj):
        """Whether the airline has assigned a PNR."""
        return 'CONFIRMED' if obj.pnr else 'PENDING'

class ContactMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = '__all__'
        
class AdminUserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password', 'profile', 'is_staff', 'is_superuser', 'date_joined')
        read_only_fields = ('id', 'date_joined')
        extra_kwargs = {'password': {'write_only': True, 'required': False}}

    def create(self, validated_data):
        profile_data = validated_data.pop('profile', {})
        password = validated_data.pop('password', f'{settings.BRAND_NAME.lower()}123') # Default password if not provided
        
        if 'username' in validated_data:
            validated_data['username'] = validated_data['username'].lower()
        # email is preserved as provided
            
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        
        # UserProfile is created via signal or manually. 
        # Since RegisterSerializer does it manually, we'll do it here too just in case.
        UserProfile.objects.update_or_create(user=user, defaults=profile_data)
        return user

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', None)
        password = validated_data.pop('password', None)
        
        for attr, value in validated_data.items():
            if attr == 'username':
                value = value.lower()
            setattr(instance, attr, value)
        
        if password:
            instance.set_password(password)
            
        instance.save()

        if profile_data:
            profile = instance.profile
            # Handle wallet fields separately if needed, but for now allow direct update
            # Note: UserProfileSerializer marks them read_only, so we might need a specific serializer for updates
            # OR we can just iterate and set. Since AdminUserSerializer uses UserProfileSerializer as a nested field,
            # and UserProfileSerializer has them as read_only, they might be stripped from validated_data.
            # Let's fix this by using a writable serializer for the profile in AdminUserSerializer 
            # OR extracting them manually from initial_data if DRF strips them.
            # Better approach: Create a WritableUserProfileSerializer for Admin use.
             
            for attr, value in profile_data.items():
                setattr(profile, attr, value)
            profile.save()
            
        return instance

class TopUpRequestSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = TopUpRequest
        fields = '__all__'
        read_only_fields = ('user', 'status', 'created_at', 'updated_at')

class FlyerSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Flyer
        fields = ('id', 'description', 'image_url', 'is_active', 'created_at')

    def get_image_url(self, obj):
        if not obj.image_data:
            return None
        
        request = self.context.get('request')
        from django.urls import reverse
        url = reverse('serve-flyer-image', kwargs={'pk': obj.pk})
        
        if request:
            absolute_uri = request.build_absolute_uri(url)
            # Ensure HTTPS for production-like environments
            if request.is_secure() or request.META.get('HTTP_X_FORWARDED_PROTO') == 'https' or settings.BRAND_DOMAIN in request.get_host():
                return absolute_uri.replace('http://', 'https://')
            return absolute_uri
        return url
