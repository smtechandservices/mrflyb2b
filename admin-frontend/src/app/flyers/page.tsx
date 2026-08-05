'use client';

import { useEffect, useState } from 'react';
import { getAdminFlyers, createFlyer, updateFlyer, deleteFlyer, Flyer } from '@/lib/api';
import { Plus, Edit2, Trash2, X, Image as ImageIcon } from 'lucide-react';
import Swal from 'sweetalert2';

export default function AdminFlyersPage() {
    const [flyers, setFlyers] = useState<Flyer[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingFlyer, setEditingFlyer] = useState<Flyer | null>(null);

    // Form state
    const [description, setDescription] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    useEffect(() => {
        fetchFlyers();
    }, []);

    const fetchFlyers = async () => {
        try {
            setLoading(true);
            const data = await getAdminFlyers();
            setFlyers(data);
        } catch (error) {
            console.error('Failed to fetch flyers', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                await deleteFlyer(id);
                fetchFlyers();
                Swal.fire('Deleted!', 'The flyer has been deleted.', 'success');
            } catch (error) {
                Swal.fire({ icon: 'error', title: 'Oops...', text: 'Failed to delete flyer.' });
            }
        }
    };

    const openModal = (flyer?: Flyer) => {
        if (flyer) {
            setEditingFlyer(flyer);
            setDescription(flyer.description || '');
            setIsActive(flyer.is_active);
            setImagePreview(flyer.image_url);
        } else {
            setEditingFlyer(null);
            setDescription('');
            setIsActive(true);
            setImagePreview(null);
        }
        setImageFile(null);
        setIsModalOpen(true);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const formData = new FormData();
            formData.append('description', description);
            formData.append('is_active', String(isActive));
            if (imageFile) {
                formData.append('image', imageFile);
            }

            if (editingFlyer) {
                await updateFlyer(editingFlyer.id, formData);
                Swal.fire({ icon: 'success', title: 'Flyer Updated', timer: 1500, showConfirmButton: false });
            } else {
                if (!imageFile) {
                    Swal.fire({ icon: 'error', title: 'Image Required', text: 'Please upload an image for the new flyer.' });
                    return;
                }
                await createFlyer(formData);
                Swal.fire({ icon: 'success', title: 'Flyer Created', timer: 1500, showConfirmButton: false });
            }

            setIsModalOpen(false);
            fetchFlyers();
        } catch (error: any) {
            Swal.fire({ icon: 'error', title: 'Save Failed', text: error.message || 'Failed to save flyer.' });
        }
    };

    return (
        <>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, marginBottom: 28 }}>
                <div>
                    <h2>Flyer Management</h2>
                    <p className="sub" style={{ margin: '6px 0 0' }}>Promotional flyers shown to agents on the booking site.</p>
                </div>
                <button onClick={() => openModal()} className="btn btn-primary btn-sm">
                    <Plus size={14} /> Add Flyer
                </button>
            </div>

            {loading ? (
                <div className="panel">
                    <div style={{ padding: 64, textAlign: 'center', color: 'var(--muted)' }}>Loading flyers…</div>
                </div>
            ) : flyers.length === 0 ? (
                <div className="panel">
                    <div style={{ padding: 64, textAlign: 'center', color: 'var(--muted)' }}>No flyers found.</div>
                </div>
            ) : (
                <div className="cards" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
                    {flyers.map((flyer) => (
                        <div key={flyer.id} className="card" style={{ cursor: 'default' }}>
                            <div
                                className="card-img wide"
                                style={{
                                    backgroundImage: flyer.image_url ? `url(${flyer.image_url})` : undefined,
                                    display: flyer.image_url ? undefined : 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                {!flyer.image_url && <ImageIcon size={28} color="var(--muted)" />}
                                <span className={`status ${flyer.is_active ? 'confirmed' : 'cancelled'}`} style={{ position: 'absolute', top: 14, right: 14 }}>
                                    <span className="d"></span>{flyer.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>

                            <p className="clamp-2" style={{ fontSize: 13.5, color: 'var(--ink-2)', minHeight: '2.6em', margin: 0 }}>
                                {flyer.description || 'No description'}
                            </p>

                            <div className="card-foot">
                                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>
                                    {new Date(flyer.created_at).toLocaleDateString()}
                                </span>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <button onClick={() => openModal(flyer)} className="btn btn-ghost btn-sm" style={{ padding: 6 }} title="Edit flyer">
                                        <Edit2 size={14} />
                                    </button>
                                    <button onClick={() => handleDelete(flyer.id)} className="btn btn-ghost btn-sm" style={{ padding: 6, color: '#b8443a' }} title="Delete flyer">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Flyer Modal */}
            {isModalOpen && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setIsModalOpen(false)}><X size={16} /></button>
                        <h3>{editingFlyer ? 'Edit Flyer' : 'Add New Flyer'}</h3>
                        <p className="modal-sub">Upload the promotional image and optional caption.</p>

                        <form onSubmit={handleSubmit}>
                            <div className="field-group" style={{ marginBottom: 18 }}>
                                <label>Flyer Image</label>
                                <div style={{
                                    border: '1px solid var(--line)',
                                    borderRadius: 'var(--radius-md)',
                                    overflow: 'hidden',
                                    background: 'var(--sand)',
                                    height: 180,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: 10,
                                }}>
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                    ) : (
                                        <ImageIcon size={32} color="var(--muted)" />
                                    )}
                                </div>
                                <input
                                    type="file"
                                    id="image-upload"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={handleImageChange}
                                />
                                <button type="button" onClick={() => document.getElementById('image-upload')?.click()} className="btn btn-ghost btn-sm">
                                    {imagePreview ? 'Change Image' : 'Choose Image'}
                                </button>
                            </div>

                            <div className="field-group" style={{ marginBottom: 18 }}>
                                <label>Description (Optional)</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Enter flyer description…"
                                    rows={4}
                                    style={{
                                        padding: '12px 14px',
                                        border: '1px solid var(--line-2)',
                                        background: 'var(--paper)',
                                        borderRadius: 'var(--radius)',
                                        fontSize: 14,
                                        fontFamily: 'var(--sans)',
                                        color: 'var(--ink)',
                                        outline: 'none',
                                        resize: 'vertical',
                                    }}
                                />
                            </div>

                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13.5, color: 'var(--ink-2)', marginBottom: 24 }}>
                                <input
                                    type="checkbox"
                                    checked={isActive}
                                    onChange={(e) => setIsActive(e.target.checked)}
                                    style={{ width: 15, height: 15 }}
                                />
                                Active (visible to agents)
                            </label>

                            <div style={{ display: 'flex', gap: 12 }}>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-ghost" style={{ flex: 1 }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                                    {editingFlyer ? 'Update Flyer' : 'Create Flyer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
