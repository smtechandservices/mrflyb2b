'use client';

import { useEffect, useState } from 'react';
import { getAdminContactMessages, ContactMessage } from '@/lib/api';
import { RefreshCw, Mail, Clock } from 'lucide-react';
import Swal from 'sweetalert2';

export default function MessagesPage() {
    const [messages, setMessages] = useState<ContactMessage[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchMessages = async () => {
        setLoading(true);
        try {
            const data = await getAdminContactMessages(1);
            setMessages(data.results);
        } catch (error) {
            console.error('Failed to fetch messages', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
    }, []);

    const showMessageDetails = (msg: ContactMessage) => {
        Swal.fire({
            title: `Message from ${msg.name}`,
            html: `
                <div style="text-align:left; font-family: var(--sans);">
                    <div style="margin-bottom:16px;">
                        <label style="display:block; font-size:11px; font-weight:500; letter-spacing:0.1em; text-transform:uppercase; color:var(--muted); margin-bottom:4px;">Email</label>
                        <a href="mailto:${msg.email}" style="color:var(--clay); font-weight:500;">${msg.email}</a>
                    </div>
                    <div style="margin-bottom:16px;">
                        <label style="display:block; font-size:11px; font-weight:500; letter-spacing:0.1em; text-transform:uppercase; color:var(--muted); margin-bottom:4px;">Received</label>
                        <div style="color:var(--ink); font-weight:500;">${new Date(msg.created_at).toLocaleString()}</div>
                    </div>
                    <div style="background:var(--sand); padding:16px; border-radius:4px; border:1px solid var(--line);">
                        <label style="display:block; font-size:11px; font-weight:500; letter-spacing:0.1em; text-transform:uppercase; color:var(--muted); margin-bottom:8px;">Content</label>
                        <p style="color:var(--ink); white-space:pre-wrap; line-height:1.6; font-size:14px; margin:0;">${msg.message}</p>
                    </div>
                </div>
            `,
            width: '600px',
            showConfirmButton: false,
            showCloseButton: true,
            confirmButtonText: 'Close'
        });
    }

    return (
        <div className="admin-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
                <div>
                    <h2>Contact Messages</h2>
                    <p className="sub" style={{ margin: '6px 0 0' }}>View inquiries and feedback from agents</p>
                </div>
                <button
                    onClick={fetchMessages}
                    className="btn btn-ghost btn-sm"
                    title="Refresh List"
                >
                    <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            <div className="panel">
                <div style={{ overflowX: 'auto' }}>
                    <table className="dtable">
                        <thead>
                            <tr>
                                <th>Sender</th>
                                <th>Email</th>
                                <th>Message preview</th>
                                <th>Date</th>
                                <th style={{ textAlign: 'right' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && messages.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ padding: 48, textAlign: 'center', color: 'var(--muted)' }}>
                                        Loading messages…
                                    </td>
                                </tr>
                            ) : messages.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ padding: 64, textAlign: 'center', color: 'var(--muted)' }}>
                                        <Mail size={32} style={{ marginBottom: 16, color: 'var(--clay)' }} />
                                        <p>No messages yet. Inbox is empty.</p>
                                    </td>
                                </tr>
                            ) : (
                                messages.map((msg) => (
                                    <tr key={msg.id} style={{ cursor: 'pointer' }} onClick={() => showMessageDetails(msg)}>
                                        <td style={{ fontWeight: 500 }}>{msg.name}</td>
                                        <td style={{ color: 'var(--ink-2)' }}>{msg.email}</td>
                                        <td>
                                            <div className="clamp-2" style={{ color: 'var(--ink-2)', maxWidth: 320 }}>{msg.message}</div>
                                        </td>
                                        <td style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--mono)', fontSize: 12 }}>
                                                <Clock size={12} />
                                                {new Date(msg.created_at).toLocaleDateString()}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    showMessageDetails(msg);
                                                }}
                                                className="btn btn-link btn-sm"
                                            >
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
