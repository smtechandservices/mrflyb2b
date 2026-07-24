'use client';

import { useEffect, useState } from 'react';
import { getAdminFlyers, createFlyer, updateFlyer, deleteFlyer, Flyer } from '@/lib/api';
import { Plus, Edit2, Trash2, X, Image as ImageIcon, Check, XCircle } from 'lucide-react';
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
        <div className='pt-8'>
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-slate-800">Flyer Management</h2>
                <button
                    onClick={() => openModal()}
                    className="cursor-pointer flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition border border-slate-400"
                >
                    <Plus className="w-5 h-5" />
                    Add Flyer
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4 font-medium text-slate-500">Image</th>
                            <th className="px-6 py-4 font-medium text-slate-500">Description</th>
                            <th className="px-6 py-4 font-medium text-slate-500">Status</th>
                            <th className="px-6 py-4 font-medium text-slate-500">Created At</th>
                            <th className="px-6 py-4 font-medium text-slate-500 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                        <span>Loading flyers...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : flyers.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                    No flyers found.
                                </td>
                            </tr>
                        ) : (
                            flyers.map((flyer) => (
                                <tr key={flyer.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        <div className="h-16 w-24 bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                                            {flyer.image_url ? (
                                                <img src={flyer.image_url} alt="Flyer" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                    <ImageIcon className="w-6 h-6" />
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 max-w-xs truncate">
                                        {flyer.description || 'No description'}
                                    </td>
                                    <td className="px-6 py-4">
                                        {flyer.is_active ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                <Check className="w-3 h-3" /> Active
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                                <XCircle className="w-3 h-3" /> Inactive
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">
                                        {new Date(flyer.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => openModal(flyer)}
                                            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 mr-2"
                                        >
                                            <Edit2 className="cursor-pointer w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(flyer.id)}
                                            className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50"
                                        >
                                            <Trash2 className="cursor-pointer w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                            <h3 className="text-xl font-bold text-slate-800">
                                {editingFlyer ? 'Edit Flyer' : 'Add New Flyer'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="cursor-pointer w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Image Upload */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Flyer Image</label>
                                <div 
                                    className="relative h-48 w-full border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition cursor-pointer overflow-hidden"
                                    onClick={() => document.getElementById('image-upload')?.click()}
                                >
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                                    ) : (
                                        <>
                                            <ImageIcon className="w-10 h-10 text-slate-400 mb-2" />
                                            <p className="text-sm text-slate-500">Click to upload image</p>
                                        </>
                                    )}
                                    <input 
                                        type="file" 
                                        id="image-upload" 
                                        className="hidden" 
                                        accept="image/*"
                                        onChange={handleImageChange}
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Description (Optional)</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-700 h-24"
                                    placeholder="Enter flyer description..."
                                />
                            </div>

                            {/* Is Active */}
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="is-active"
                                    checked={isActive}
                                    onChange={(e) => setIsActive(e.target.checked)}
                                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="is-active" className="text-sm font-medium text-slate-700">Active (Visible to users)</label>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium shadow-sm shadow-blue-200"
                                >
                                    {editingFlyer ? 'Update Flyer' : 'Create Flyer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
