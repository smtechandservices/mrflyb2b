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
                <p style="margin-bottom:12px;color:#3a3530;">Adding <strong>₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> to your wallet</p>
                <div style="text-align:left;">
                    <label style="font-size:12px;font-family:monospace;text-transform:uppercase;letter-spacing:0.08em;color:#756e63;display:block;margin-bottom:6px;">Remarks (optional)</label>
                    <textarea id="topup-remarks" rows="2" placeholder="e.g. UTR number, bank reference…" style="width:100%;border:1px solid #c9bda3;border-radius:4px;padding:8px 10px;font-size:13px;color:#1c1916;resize:none;box-sizing:border-box;outline:none;font-family:inherit;"></textarea>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#1f3b30',
            cancelButtonColor: '#756e63',
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
                confirmButtonColor: '#1f3b30',
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
                            confirmButtonColor: '#1f3b30',
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
                    color: "#1f3b30"
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
            <div className="container page-content-sm" style={{ textAlign: 'center' }}>
                <h1 style={{ marginBottom: 12 }}>Agency Wallet</h1>
                <p style={{ color: 'var(--muted)' }}>Please log in to view your agency's wallet.</p>
            </div>
        );
    }

    return (
        <div className="page-content-sm">
            <Script src="https://checkout.razorpay.com/v1/checkout.js" />

            <div className="container">
                <span className="eyebrow">— Account</span>
                <h1 style={{ marginTop: 8, marginBottom: 32 }}>Agency Wallet</h1>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--muted)' }}>
                        Loading wallet details…
                    </div>
                ) : !walletData ? (
                    <div style={{ textAlign: 'center', padding: '64px 0', color: '#b8443a' }}>Failed to load wallet data.</div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 32 }}>
                        <div>
                            <div className="kpis" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
                                <div className="kpi">
                                    <div className="lbl">Spending Power</div>
                                    <div className="v">₹{walletData.available_spending_power.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</div>
                                </div>
                                <div className="kpi">
                                    <div className="lbl">Wallet Balance</div>
                                    <div className="v" style={{ fontSize: 26 }}>₹{parseFloat(walletData.wallet_balance.toString()).toLocaleString('en-IN', { minimumFractionDigits: 0 })}</div>
                                </div>
                                <div className="kpi">
                                    <div className="lbl">Credit Limit</div>
                                    <div className="v" style={{ fontSize: 26 }}>₹{parseFloat(walletData.credit_limit.toString()).toLocaleString('en-IN', { minimumFractionDigits: 0 })}</div>
                                </div>
                                <div className="kpi">
                                    <div className="lbl">Total Dues</div>
                                    <div className="v" style={{ fontSize: 26, color: '#b8443a' }}>₹{parseFloat(walletData.total_dues.toString()).toLocaleString('en-IN', { minimumFractionDigits: 0 })}</div>
                                </div>
                            </div>

                            <div className="panel">
                                <div className="panel-head">
                                    <h4 className="row" style={{ gap: 8 }}><History size={16} style={{ color: 'var(--muted)' }} />Recent Transactions</h4>
                                </div>
                                <div style={{ maxHeight: 600, overflowY: 'auto' }}>
                                    {walletData.recent_transactions.length === 0 ? (
                                        <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>No recent transactions found.</div>
                                    ) : (
                                        <table className="dtable">
                                            <tbody>
                                                {walletData.recent_transactions.map((tx) => {
                                                    const isRefund = tx.description.toLowerCase().includes('refund');
                                                    const isRazorpay = tx.description.toLowerCase().includes('razorpay');
                                                    const Icon = isRefund ? RotateCcw : isRazorpay ? CreditCard : tx.transaction_type === 'CREDIT' ? ArrowDownLeft : ArrowUpRight;
                                                    return (
                                                        <tr key={tx.id}>
                                                            <td style={{ width: 36 }}>
                                                                <Icon size={16} style={{ color: tx.transaction_type === 'CREDIT' ? 'var(--forest)' : '#b8443a' }} />
                                                            </td>
                                                            <td>
                                                                <div style={{ fontWeight: 500 }}>{tx.description}</div>
                                                                <div className="mono" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                                                                    {new Date(tx.timestamp).toLocaleString()}
                                                                    {tx.transaction_id && ` · ID: ${tx.transaction_id}`}
                                                                </div>
                                                                {tx.remarks && (
                                                                    <div style={{ fontSize: 11, color: '#97712a', fontStyle: 'italic', marginTop: 2 }}>Admin note: {tx.remarks}</div>
                                                                )}
                                                            </td>
                                                            <td className="mono" style={{ textAlign: 'right', fontWeight: 600, color: tx.transaction_type === 'CREDIT' ? 'var(--forest)' : 'var(--ink)' }}>
                                                                {tx.transaction_type === 'CREDIT' ? '+' : '-'} ₹{parseFloat(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                                <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 400 }}>Bal: ₹{parseFloat(tx.balance_after).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            <div className="panel">
                                <div className="panel-head">
                                    <h4 className="row" style={{ gap: 8 }}><CreditCard size={16} style={{ color: 'var(--muted)' }} />Top Up Wallet</h4>
                                </div>
                                <div className="panel-body">
                                    {user?.profile?.kyc_status === 'SUBMITTED' ? (
                                        <div style={{ textAlign: 'center', padding: '16px 0' }}>
                                            <Clock size={28} style={{ color: '#1e5ab4', margin: '0 auto 12px' }} />
                                            <h4 style={{ marginBottom: 6 }}>KYC under review</h4>
                                            <p style={{ fontSize: 13, color: 'var(--muted)' }}>
                                                Your agency's documents have been submitted and are currently being reviewed. You'll be able to top up once verified.
                                            </p>
                                        </div>
                                    ) : user?.profile?.kyc_status === 'REJECTED' ? (
                                        <div style={{ textAlign: 'center', padding: '16px 0' }}>
                                            <AlertCircle size={28} style={{ color: '#b8443a', margin: '0 auto 12px' }} />
                                            <h4 style={{ marginBottom: 6 }}>KYC rejected</h4>
                                            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
                                                Your agency's KYC verification was rejected. Please re-submit your documents.
                                            </p>
                                            <button onClick={() => window.dispatchEvent(new CustomEvent('open-kyc-modal'))} className="btn btn-ghost btn-sm" style={{ color: '#b8443a', margin: '0 auto' }}>
                                                Re-submit KYC
                                            </button>
                                        </div>
                                    ) : user?.profile?.kyc_status !== 'VERIFIED' ? (
                                        <div style={{ textAlign: 'center', padding: '16px 0' }}>
                                            <AlertCircle size={28} style={{ color: '#97712a', margin: '0 auto 12px' }} />
                                            <h4 style={{ marginBottom: 6 }}>KYC verification required</h4>
                                            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
                                                You must verify your agency's KYC documents before you can top up your wallet.
                                            </p>
                                            <button onClick={() => window.dispatchEvent(new CustomEvent('open-kyc-modal'))} className="btn btn-primary btn-sm" style={{ margin: '0 auto' }}>
                                                Complete KYC Now
                                            </button>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleTopUp} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                            <div className="field-group">
                                                <label>Amount to add / pay dues</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    step="0.01"
                                                    required
                                                    value={topUpAmount}
                                                    onChange={(e) => setTopUpAmount(e.target.value)}
                                                    placeholder="0.00"
                                                    className="mono"
                                                />
                                            </div>

                                            <div className="row" style={{ gap: 10, fontSize: 13, color: 'var(--muted)', background: 'var(--sand)', padding: 14, borderRadius: 4 }}>
                                                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2, color: 'var(--clay)' }} />
                                                <p>Top-ups will first clear any outstanding dues before adding to your wallet balance.</p>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={handleRazorpayTopUp}
                                                disabled={isProcessingRazorpay || isProcessingManual || !topUpAmount}
                                                className="btn btn-primary"
                                            >
                                                {isProcessingRazorpay ? 'Processing…' : 'Instant Top Up'}
                                            </button>

                                            <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>OR</div>

                                            <button
                                                type="submit"
                                                disabled={isProcessingManual || isProcessingRazorpay || !topUpAmount}
                                                className="btn btn-ghost"
                                            >
                                                {isProcessingManual ? 'Processing…' : (<>Request Manual Top Up <ArrowUpRight size={14} /></>)}
                                            </button>

                                            <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--muted)' }}>
                                                Payments powered by SSD GLOBAL TRAVELS
                                            </div>
                                        </form>
                                    )}
                                </div>
                            </div>

                            <div style={{ background: 'var(--sand)', borderRadius: 4, padding: 20, textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
                                Need a higher credit limit?<br />
                                <a href="/contact" className="btn-link" style={{ marginTop: 4, display: 'inline-block' }}>Contact Support</a>
                            </div>

                            <div className="panel">
                                <div className="panel-head">
                                    <h4 className="row" style={{ gap: 8 }}><Clock size={16} style={{ color: 'var(--muted)' }} />Recent Top-up Requests</h4>
                                </div>
                                <div>
                                    {topUpRequests.length === 0 ? (
                                        <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontStyle: 'italic', fontSize: 13 }}>No recent top-up requests found.</div>
                                    ) : (
                                        <table className="dtable">
                                            <tbody>
                                                {topUpRequests.map((req) => {
                                                    const StatusIcon = req.status === 'PENDING' ? Clock : req.status === 'APPROVED' ? CheckCircle2 : XCircle;
                                                    const statusClass = req.status === 'PENDING' ? 'pending' : req.status === 'APPROVED' ? 'confirmed' : 'cancelled';
                                                    return (
                                                        <tr key={req.id}>
                                                            <td style={{ width: 28 }}><StatusIcon size={15} style={{ color: 'var(--muted)' }} /></td>
                                                            <td>
                                                                <div className="mono" style={{ fontWeight: 600 }}>₹{parseFloat(req.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                                                                <div className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{new Date(req.created_at).toLocaleString()}</div>
                                                                {req.user_remarks && <div style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic', marginTop: 2 }}>Your note: {req.user_remarks}</div>}
                                                                {req.remarks && <div style={{ fontSize: 11, color: '#97712a', fontStyle: 'italic', marginTop: 2 }}>Admin: {req.remarks}</div>}
                                                            </td>
                                                            <td style={{ textAlign: 'right' }}>
                                                                <div className={`status ${statusClass}`} style={{ display: 'inline-flex' }}>
                                                                    <span className="d" />{req.status}
                                                                </div>
                                                                <div className="mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>{req.method}</div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
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
