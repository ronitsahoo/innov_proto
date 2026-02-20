import { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { BookOpen, Trash2, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AddDocuments() {
    const { fetchAdminSettings, updateRequiredDocuments } = useData();

    const [reqDocs, setReqDocs] = useState([]);
    const [newDocName, setNewDocName] = useState('');
    const [newDocDesc, setNewDocDesc] = useState('');
    const [docsLoading, setDocsLoading] = useState(false);
    const [docsSaved, setDocsSaved] = useState(false);

    useEffect(() => {
        const load = async () => {
            const settings = await fetchAdminSettings();
            if (settings) {
                setReqDocs(settings.requiredDocuments || []);
            }
        };
        load();
    }, [fetchAdminSettings]);

    const container = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <motion.div
            className="space-y-8 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8"
            variants={container}
            initial="hidden"
            animate="show"
        >
            <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between gap-6 backdrop-blur-sm bg-white/70 dark:bg-black/20 p-6 rounded-3xl border border-gray-200 dark:border-white/5 shadow-md">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-2">
                        Add Required Documents
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        Configure documents that students need to upload.
                    </p>
                </div>
            </motion.div>

            <motion.div variants={item} className="bg-white dark:bg-[#111] rounded-3xl border border-gray-200 dark:border-white/5 shadow-xl overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-white/5 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <BookOpen size={20} className="text-purple-500" />
                        Document List
                    </h3>
                    <span className="text-xs bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2 py-1 rounded-full font-semibold">
                        {reqDocs.length} defined
                    </span>
                </div>
                <div className="p-6 space-y-4">
                    {/* Existing docs list */}
                    {reqDocs.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">No documents defined yet. Add one below.</p>
                    ) : (
                        <ul className="space-y-2">
                            {reqDocs.map((doc, idx) => (
                                <li key={doc._id || idx} className="flex items-center justify-between bg-gray-50 dark:bg-white/5 rounded-xl px-4 py-3">
                                    <div>
                                        <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">{doc.name}</p>
                                        {doc.description && <p className="text-xs text-gray-400">{doc.description}</p>}
                                        <code className="text-[10px] text-purple-500 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 px-1 rounded">{doc.type}</code>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            const updated = reqDocs.filter((_, i) => i !== idx);
                                            setReqDocs(updated);
                                            await updateRequiredDocuments(updated);
                                        }}
                                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}

                    {/* Add new doc form */}
                    <div className="border-t border-gray-100 dark:border-white/5 pt-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Add Document Type</p>
                        <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Display Name (e.g. 10th Marksheet)"
                                    value={newDocName}
                                    onChange={e => setNewDocName(e.target.value)}
                                    className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-400"
                                />
                                <input
                                    type="text"
                                    placeholder="Hint (optional)"
                                    value={newDocDesc}
                                    onChange={e => setNewDocDesc(e.target.value)}
                                    className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-400"
                                />
                            </div>
                            <button
                                disabled={!newDocName.trim() || docsLoading}
                                onClick={async () => {
                                    if (!newDocName.trim()) return;
                                    setDocsLoading(true);
                                    const typeKey = newDocName.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                                    const updated = [...reqDocs, { name: newDocName.trim(), type: typeKey, description: newDocDesc.trim() }];
                                    await updateRequiredDocuments(updated);
                                    setReqDocs(updated);
                                    setNewDocName('');
                                    setNewDocDesc('');
                                    setDocsSaved(true);
                                    setDocsLoading(false);
                                    setTimeout(() => setDocsSaved(false), 2000);
                                }}
                                className="flex items-center justify-center gap-2 text-sm px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold disabled:opacity-50 transition-colors"
                            >
                                <Plus size={16} /> {docsLoading ? 'Saving...' : docsSaved ? '✅ Saved!' : 'Add Document'}
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
