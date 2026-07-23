'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getWalletBalance, topUpWallet, WalletData, getTopUpRequests, TopUpRequest, createRazorpayOrder, verifyRazorpayPayment } from '@/lib/api';
import Script from 'next/script';
import { Wallet, CreditCard, ArrowUpRight, ArrowDownLeft, AlertCircle, History, RotateCcw, Clock, CheckCircle2, XCircle } from 'lucide-react';
import Swal from 'sweetalert2';
import { BRAND } from '@/config/brand';

export default function WalletPage() {
    const { user, isAuthenticated } = useAuth();
    const [walletData, setWalletData] = useState<WalletData | null>(null);
    const [topUpRequests, setTopUpRequests] = useState<TopUpRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [topUpAmount, setTopUpAmount] = useState('');
    const [isProcessingManual, setIsProcessingManual] = useState(false);
    const [isProcessingRazorpay, setIsProcessingRazorpay] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            fetchData();
        }
    }, [isAuthenticated]);

    const fetchData = async () => {
        setLoading(true);
        await Promise.all([fetchWalletData(), fetchTopUpRequests()]);
        setLoading(false);
    };

    const fetchWalletData = async () => {
        try {
            const data = await getWalletBalance();
            setWalletData(data);
        } catch (error) {
            console.error('Failed to fetch wallet data', error);
        }
    };

    const fetchTopUpRequests = async () => {
        try {
            const requests = await getTopUpRequests();
            setTopUpRequests(requests);
        } catch (error) {
            console.error('Failed to fetch top-up requests', error);
        }
    };

    const handleTopUp = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(topUpAmount);
        if (isNaN(amount) || amount <= 0) {
            Swal.fire('Error', 'Please enter a valid amount', 'error');
            return;
        }


        const result = await Swal.fire({
            title: 'Confirm Top-up',
            html: `
                <p style="margin-bottom:12px;color:#475569;">Adding <strong>₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> to your wallet</p>
                <div style="text-align:left;">
                    <label style="font-size:13px;font-weight:600;color:#64748b;display:block;margin-bottom:6px;">Remarks <span style="font-weight:400;color:#94a3b8;">(optional)</span></label>
                    <textarea id="topup-remarks" rows="2" placeholder="e.g. UTR number, bank reference…" style="width:100%;border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px;font-size:13px;color:#1e293b;resize:none;box-sizing:border-box;outline:none;"></textarea>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#16a34a',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, proceed',
            cancelButtonText: 'Cancel',
            preConfirm: () => (document.getElementById('topup-remarks') as HTMLTextAreaElement)?.value?.trim() || '',
        });

        if (!result.isConfirmed) {
            return;
        }

        const remarks = result.value as string;

        setIsProcessingManual(true);
        try {
            const result = await topUpWallet(amount, remarks || undefined);
            Swal.fire({
                icon: 'success',
                title: 'Request Submitted',
                text: 'Your top-up request has been submitted and is pending admin approval.',
                confirmButtonColor: '#16a34a',
            });
            setTopUpAmount('');
            fetchTopUpRequests(); // Refresh requests list
            // Notify admin
            fetch('/api/admin/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'topup_request',
                    userName: user?.username,
                    userEmail: user?.email,
                    amount,
                    requestId: result.request_id,
                    method: 'MANUAL',
                    remarks: remarks || undefined,
                }),
            }).catch(() => {});
        } catch (error: any) {
            Swal.fire('Error', error.message || 'Top-up failed', 'error');
        } finally {
            setIsProcessingManual(false);
        }
    };

    const handleRazorpayTopUp = async () => {
        const amount = parseFloat(topUpAmount);
        if (isNaN(amount) || amount <= 0) {
            Swal.fire('Error', 'Please enter a valid amount', 'error');
            return;
        }

        setIsProcessingRazorpay(true);
        try {
            // 1. Create Razorpay Order on Backend
            const orderData = await createRazorpayOrder(amount);

            // 2. Open Razorpay Checkout
            const options = {
                key: orderData.key,
                amount: orderData.amount,
                currency: orderData.currency,
                name: BRAND.name,
                description: "Wallet Top-up",
                order_id: orderData.order_id,
                handler: async function (response: any) {
                    try {
                        setIsProcessingRazorpay(true);
                        // 3. Verify Payment on Backend
                        await verifyRazorpayPayment({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        });

                        Swal.fire({
                            icon: 'success',
                            title: 'Top-up Successful',
                            text: `₹${amount.toLocaleString('en-IN')} has been added to your wallet instantly.`,
                            confirmButtonColor: '#16a34a',
                        });

                        setTopUpAmount('');
                        fetchData(); // Refresh everything
                        // Notify admin
                        fetch('/api/admin/notify', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                type: 'topup_request',
                                userName: user?.username,
                                userEmail: user?.email,
                                amount,
                                requestId: response.razorpay_payment_id,
                                method: 'RAZORPAY',
                            }),
                        }).catch(() => {});
                    } catch (error: any) {
                        Swal.fire('Error', 'Payment verification failed', 'error');
                    } finally {
                        setIsProcessingRazorpay(false);
                    }
                },
                prefill: {
                    name: user?.username,
                    email: user?.email,
                    contact: user?.profile?.phone_number
                },
                theme: {
                    color: "#16a34a"
                },
                modal: {
                    ondismiss: function() {
                        setIsProcessingRazorpay(false);
                    }
                }
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.on('payment.failed', function (response: any) {
                Swal.fire('Payment Failed', response.error.description, 'error');
                setIsProcessingRazorpay(false);
            });
            rzp.open();
        } catch (error: any) {
            Swal.fire('Error', error.message || 'Failed to initiate payment', 'error');
            setIsProcessingRazorpay(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-slate-50 py-12 px-4">
                <div className="max-w-4xl mx-auto text-center pt-8">
                    <h1 className="text-3xl font-bold text-slate-800 mb-4">My Wallet</h1>
                    <p className="text-slate-600">Please log in to view your wallet.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Script src="https://checkout.razorpay.com/v1/checkout.js" />

            {/* Hero Section */}
            <div className="bg-slate-900 py-10 px-4 text-center">
            </div>

            <div className="mx-auto px-6 md:px-12 pt-8 md:pt-10 relative z-10">
                <h1 className="text-3xl md:text-5xl font-extrabold text-slate-700 mb-2">
                    My <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">Wallet</span>
                </h1>
                <p className="text-slate-400 text-base md:text-lg leading-relaxed mb-2">
                    Manage your funds, credit limit, and transaction history in one secure place.
                </p>
            </div>

            <div className="mx-auto px-4 md:px-12 py-12 -mt-10 relative z-10">

                {loading ? (
                    <div className="text-center py-12">
                        <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-500">Loading wallet details...</p>
                    </div>
                ) : !walletData ? (
                    <div className="text-center py-12 text-red-500">Failed to load wallet data.</div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Wallet Card */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-10">
                                    <Wallet className="w-64 h-64" />
                                </div>

                                <div className="relative z-10">
                                    <p className="text-gray-400 font-medium mb-1 text-sm md:text-base">Available Spending Power</p>
                                    <h2 className="text-3xl md:text-5xl font-bold mb-8">
                                        ₹{walletData.available_spending_power.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </h2>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-gray-700">
                                        <div>
                                            <p className="text-gray-400 text-xs md:text-sm mb-1">Wallet Balance</p>
                                            <p className="text-xl md:text-2xl font-semibold text-green-400">
                                                ₹{parseFloat(walletData.wallet_balance.toString()).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400 text-xs md:text-sm mb-1">Credit Limit</p>
                                            <p className="text-lg md:text-xl font-semibold text-blue-400">
                                                ₹{parseFloat(walletData.credit_limit.toString()).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400 text-xs md:text-sm mb-1">Total Dues</p>
                                            <p className="text-lg md:text-xl font-semibold text-red-400">
                                                ₹{parseFloat(walletData.total_dues.toString()).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Transactions */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                        <History className="w-5 h-5 text-gray-500" />
                                        Recent Transactions
                                    </h3>
                                </div>
                                <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                                    {walletData.recent_transactions.length === 0 ? (
                                        <div className="p-8 text-center text-gray-500">
                                            No recent transactions found.
                                        </div>
                                    ) : (
                                        walletData.recent_transactions.map((tx) => (
                                            <div key={tx.id} className="p-6 hover:bg-gray-50 transition-colors flex items-center justify-between group">
                                                <div className="flex items-start gap-3 md:gap-4 overflow-hidden">
                                                    <div className={`p-2.5 md:p-3 rounded-full shrink-0 ${
                                                        tx.description.toLowerCase().includes('refund')
                                                            ? 'bg-blue-100 text-blue-600'
                                                            : tx.description.toLowerCase().includes('razorpay')
                                                                ? 'bg-indigo-100 text-indigo-600'
                                                                : tx.transaction_type === 'CREDIT'
                                                                    ? 'bg-green-100 text-green-600'
                                                                    : 'bg-red-100 text-red-600'
                                                        }`}>
                                                        {tx.description.toLowerCase().includes('refund') ? (
                                                            <RotateCcw className="w-4 h-4 md:w-5 md:h-5" />
                                                        ) : tx.description.toLowerCase().includes('razorpay') ? (
                                                            <CreditCard className="w-4 h-4 md:w-5 md:h-5" />
                                                        ) : tx.transaction_type === 'CREDIT' ? (
                                                            <ArrowDownLeft className="w-4 h-4 md:w-5 md:h-5" />
                                                        ) : (
                                                            <ArrowUpRight className="w-4 h-4 md:w-5 md:h-5" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-gray-900 text-sm md:text-base truncate">{tx.description}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <p className="text-[10px] md:text-sm text-gray-500">
                                                                {new Date(tx.timestamp).toLocaleString()}
                                                            </p>
                                                            {tx.transaction_id && (
                                                                <p className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 font-mono">
                                                                    ID: {tx.transaction_id}
                                                                </p>
                                                            )}
                                                        </div>
                                                        {tx.remarks && (
                                                            <p className="text-[10px] md:text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1 mt-1.5 italic">
                                                                Admin Note: {tx.remarks}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className={`font-bold text-sm md:text-base ${tx.transaction_type === 'CREDIT' ? 'text-green-600' : 'text-slate-900'
                                                        }`}>
                                                        {tx.transaction_type === 'CREDIT' ? '+' : '-'} ₹{parseFloat(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 mt-1">
                                                        Bal: ₹{parseFloat(tx.balance_after).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Top Up Section */}
                        <div className="space-y-6">
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <CreditCard className="w-5 h-5 text-gray-500" />
                                    Top Up Wallet
                                </h3>

                                {user?.profile?.kyc_status === 'SUBMITTED' ? (
                                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
                                        <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Clock className="w-6 h-6 text-blue-600" />
                                        </div>
                                        <h4 className="font-bold text-blue-900 mb-2">KYC Under Review</h4>
                                        <p className="text-sm text-blue-700">
                                            Your documents have been submitted and are currently being reviewed by our team. You'll be able to top up once verified.
                                        </p>
                                    </div>
                                ) : user?.profile?.kyc_status === 'REJECTED' ? (
                                    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                                        <div className="bg-red-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <AlertCircle className="w-6 h-6 text-red-600" />
                                        </div>
                                        <h4 className="font-bold text-red-900 mb-2">KYC Rejected</h4>
                                        <p className="text-sm text-red-700 mb-6">
                                            Your KYC verification was rejected. Please re-submit your documents.
                                        </p>
                                        <button 
                                            onClick={() => window.dispatchEvent(new CustomEvent('open-kyc-modal'))}
                                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-6 rounded-lg transition-colors text-sm"
                                        >
                                            Re-submit KYC
                                        </button>
                                    </div>
                                ) : user?.profile?.kyc_status !== 'VERIFIED' ? (
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                                        <div className="bg-amber-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <AlertCircle className="w-6 h-6 text-amber-600" />
                                        </div>
                                        <h4 className="font-bold text-amber-900 mb-2">KYC Verification Required</h4>
                                        <p className="text-sm text-amber-700 mb-6">
                                            You must verify your KYC documents before you can top up your wallet.
                                        </p>
                                        <button 
                                            onClick={() => window.dispatchEvent(new CustomEvent('open-kyc-modal'))}
                                            className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-6 rounded-lg transition-colors text-sm"
                                        >
                                            Complete KYC Now
                                        </button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleTopUp} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Amount to Add / Pay Dues
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg font-bold">₹</span>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    step="0.01"
                                                    required
                                                    value={topUpAmount}
                                                    onChange={(e) => setTopUpAmount(e.target.value)}
                                                    placeholder="0.00"
                                                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-lg font-medium text-gray-900"
                                                />
                                            </div>
                                        </div>

                                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
                                            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                            <p className="text-sm text-blue-700">
                                                Top-ups will first clear any outstanding dues before adding to your wallet balance.
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleRazorpayTopUp}
                                            disabled={isProcessingRazorpay || isProcessingManual || !topUpAmount}
                                            className="cursor-pointer w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all shadow-md shadow-blue-200 flex justify-center items-center gap-2"
                                        >
                                            {isProcessingRazorpay ? (
                                                <>
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                    Processing...
                                                </>
                                            ) : (
                                                <>
                                                    {/* <CreditCard className="w-4 h-4" /> */}
                                                    Instant Top Up
                                                </>
                                            )}
                                        </button>

                                        <div className="relative flex items-center justify-center py-2">
                                            <div className="border-t border-gray-200 w-full"></div>
                                            <span className="absolute bg-white px-3 text-xs text-gray-400 font-medium">OR</span>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={isProcessingManual || isProcessingRazorpay || !topUpAmount}
                                            className="cursor-pointer w-full bg-slate-700 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all shadow-md shadow-slate-200 flex justify-center items-center gap-2"
                                        >
                                            {isProcessingManual ? (
                                                <>
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                    Processing...
                                                </>
                                            ) : (
                                                <>
                                                    Request Manual Top Up
                                                    <ArrowUpRight className="w-4 h-4" />
                                                </>
                                            )}
                                        </button>
                                    </form>
                                )}
                            </div>

                            <div className="bg-gray-100 rounded-2xl p-6 text-center">
                                <p className="text-gray-500 text-sm">
                                    Need a higher credit limit?
                                    <br />
                                    <a href="/contact" className="text-green-600 font-bold hover:underline">Contact Support</a>
                                </p>
                            </div>

                             
                            {/* Top-up Requests Section */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-gray-500" />
                                        Recent Top-up Requests
                                    </h3>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {topUpRequests.length === 0 ? (
                                        <div className="p-8 text-center text-gray-400 italic text-sm">
                                            No recent top-up requests found.
                                        </div>
                                    ) : (
                                        topUpRequests.map((req) => (
                                            <div key={req.id} className="p-6 flex items-center justify-between group hover:bg-gray-50 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-2 rounded-lg ${
                                                        req.status === 'PENDING' ? 'bg-amber-100 text-amber-600' :
                                                        req.status === 'APPROVED' ? 'bg-green-100 text-green-600' :
                                                        'bg-red-100 text-red-600'
                                                    }`}>
                                                        {req.status === 'PENDING' ? <Clock className="w-5 h-5" /> :
                                                         req.status === 'APPROVED' ? <CheckCircle2 className="w-5 h-5" /> :
                                                         <XCircle className="w-5 h-5" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900">₹{parseFloat(req.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                                                        <p className="text-xs text-gray-500">{new Date(req.created_at).toLocaleString()}</p>
                                                        {req.razorpay_payment_id && (
                                                            <p className="text-[10px] text-blue-600 font-mono mt-0.5">ID: {req.razorpay_payment_id}</p>
                                                        )}
                                                        {req.user_remarks && (
                                                            <p className="text-[11px] text-slate-500 italic mt-1">
                                                                Your note: {req.user_remarks}
                                                            </p>
                                                        )}
                                                        {req.remarks && (
                                                            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1 mt-1 italic">
                                                                Admin: {req.remarks}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right flex flex-col items-end gap-1">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                        req.method === 'RAZORPAY' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-gray-50 text-gray-600 border border-gray-100'
                                                    }`}>
                                                        {req.method}
                                                    </span>
                                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                                                        req.status === 'PENDING' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                                                        req.status === 'APPROVED' ? 'bg-green-100 text-green-700 border border-green-200' :
                                                        'bg-red-100 text-red-700 border border-red-200'
                                                    }`}>
                                                        {req.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>

    );
}
