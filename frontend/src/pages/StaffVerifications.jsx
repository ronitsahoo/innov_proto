import { useState, useEffect, useCallback } from 'react';
import { Search, FileText, CheckCircle, XCircle, ExternalLink, ChevronDown, ChevronUp, User, Clock, AlertCircle, Loader } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

const SERVER_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');

const STATUS_CONFIG = {
    approved: { label: 'Approved', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-500/15', dot: 'bg-green-500' },
    rejected: { label: 'Rejected', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-500/15', dot: 'bg-red-500' },
    submitted: { label: 'Submitted', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-500/15', dot: 'bg-blue-500' },
    uploaded: { label: 'Uploaded', color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-500/15', dot: 'bg-yellow-500' },
    pending: { label: 'Pending', color: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-white/5', dot: 'bg-gray-400' },
};

function StatusBadge({ status }) {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color} ${cfg.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}></span>
            {cfg.label}
        </span>
    );
}

function DocumentRow({ doc, onApprove, onReject, isProcessing, studentId }) {
    const [showRejectInput, setShowRejectInput] = useState(false);
    const [reason, setReason] = useState('');

    const handleReject = () => {
        if (!reason.trim()) return alert('Please provide a rejection reason.');
        onReject(studentId, doc._id, reason);
        setShowRejectInput(false);
        setReason('');
    };

    const canAct = doc.status === 'submitted';

    return (
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-500 flex-shrink-0">
                    <FileText size={18} />
                </div>
                <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{doc.type}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{doc.originalName || 'Uploaded file'}</p>
                    {doc.rejectionReason && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                            <AlertCircle size={11} />
                            {doc.rejectionReason}
                        </p>
                    )}
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-1">
                        <Clock size={10} />
                        {doc.updatedAt ? new Date(doc.updatedAt).toLocaleString() : 'N/A'}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                <StatusBadge status={doc.status} />

                {doc.fileUrl && (
                    <button
                        onClick={() => window.open(`${SERVER_URL}${doc.fileUrl}`, '_blank')}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                    >
                        <ExternalLink size={12} /> View
                    </button>
                )}

                {canAct && !showRejectInput && (
                    <>
                        <button
                            onClick={() => onApprove(studentId, doc._id)}
                            disabled={isProcessing}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50"
                        >
                            {isProcessing ? <Loader size={12} className="animate-spin" /> : <CheckCircle size={12} />} Approve
                        </button>
                        <button
                            onClick={() => setShowRejectInput(true)}
                            disabled={isProcessing}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
                        >
                            <XCircle size={12} /> Reject
                        </button>
                    </>
                )}

                {showRejectInput && (
                    <div className="flex gap-2 items-center flex-wrap">
                        <input
                            autoFocus
                            className="text-xs border border-gray-300 dark:border-white/10 rounded-lg px-3 py-1.5 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white w-52 focus:outline-none focus:border-red-500"
                            placeholder="Rejection reason..."
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleReject()}
                        />
                        <button
                            onClick={handleReject}
                            disabled={!reason.trim()}
                            className="px-3 py-1.5 text-xs font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
                        >Confirm</button>
                        <button
                            onClick={() => { setShowRejectInput(false); setReason(''); }}
                            className="px-3 py-1.5 text-xs font-medium bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg"
                        >Cancel</button>
                    </div>
                )}
            </div>
        </div>
    );
}

function StudentCard({ student, onApprove, onReject, processing }) {
    const [expanded, setExpanded] = useState(false);
    const submittedCount = student.documents.filter(d => d.status === 'submitted').length;
    const approvedCount = student.documents.filter(d => d.status === 'approved').length;
    const rejectedCount = student.documents.filter(d => d.status === 'rejected').length;

    return (
        <div className="bg-white dark:bg-[#151515] rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm overflow-hidden">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full p-5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors text-left"
            >
                <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                        {student.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="font-bold text-gray-900 dark:text-white">{student.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{student.email}</p>
                        <div className="flex gap-2 mt-1 flex-wrap">
                            {student.branch && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400">{student.branch}</span>}
                            {student.year && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400">Year {student.year}</span>}
                            {submittedCount > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400">{submittedCount} pending review</span>}
                            {approvedCount > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-500/15 text-green-600 dark:text-green-400">{approvedCount} approved</span>}
                            {rejectedCount > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400">{rejectedCount} rejected</span>}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3 text-gray-400 flex-shrink-0">
                    <span className="text-sm">{student.documents.length} doc{student.documents.length !== 1 ? 's' : ''}</span>
                    {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="border-t border-gray-100 dark:border-white/5 divide-y divide-gray-100 dark:divide-white/5">
                            {student.documents.length === 0 ? (
                                <div className="p-6 text-center text-gray-400 text-sm">No documents uploaded yet.</div>
                            ) : (
                                student.documents.map(doc => (
                                    <DocumentRow
                                        key={doc._id}
                                        doc={doc}
                                        studentId={student._id}
                                        onApprove={onApprove}
                                        onReject={onReject}
                                        isProcessing={processing === doc._id}
                                    />
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function StaffVerifications() {
    const [students, setStudents] = useState([]);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(null);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 400);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchStudents = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/staff/all-students', {
                params: debouncedSearch ? { search: debouncedSearch } : {}
            });
            setStudents(data);
        } catch (err) {
            console.error('Failed to load students', err);
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch]);

    useEffect(() => {
        fetchStudents();
    }, [fetchStudents]);

    const handleApprove = async (studentId, docId) => {
        setProcessing(docId);
        try {
            await api.put('/staff/verify-document', { studentId, documentId: docId, status: 'approved' });
            await fetchStudents();
        } catch (err) {
            alert('Failed to approve document.');
        } finally {
            setProcessing(null);
        }
    };

    const handleReject = async (studentId, docId, reason) => {
        setProcessing(docId);
        try {
            await api.put('/staff/verify-document', { studentId, documentId: docId, status: 'rejected', rejectionReason: reason });
            await fetchStudents();
        } catch (err) {
            alert('Failed to reject document.');
        } finally {
            setProcessing(null);
        }
    };

    const totalSubmitted = students.reduce((a, s) => a + s.documents.filter(d => d.status === 'submitted').length, 0);
    const totalApproved = students.reduce((a, s) => a + s.documents.filter(d => d.status === 'approved').length, 0);
    const totalRejected = students.reduce((a, s) => a + s.documents.filter(d => d.status === 'rejected').length, 0);

    return (
        <motion.div
            className="space-y-6 pb-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            {/* Header */}
            <div className="backdrop-blur-sm bg-white/70 dark:bg-black/20 p-6 rounded-3xl border border-gray-200 dark:border-white/5 shadow-md">
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-1">
                    Document Verifications
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Search for a student and review all their submitted documents.
                    {totalSubmitted > 0 && (
                        <span className="text-orange-500 font-semibold ml-1">
                            {totalSubmitted} document{totalSubmitted !== 1 ? 's' : ''} awaiting review.
                        </span>
                    )}
                </p>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <input
                    type="text"
                    className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-[#151515] border border-gray-200 dark:border-white/10 rounded-2xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition-all shadow-sm placeholder:text-gray-400"
                    placeholder="Search students by name, email, branch or roll number..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {/* Stats Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Total Students', value: students.length, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10' },
                    { label: 'Pending Review', value: totalSubmitted, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-500/10' },
                    { label: 'Total Approved', value: totalApproved, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-500/10' },
                    { label: 'Total Rejected', value: totalRejected, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10' },
                ].map((stat, i) => (
                    <div key={i} className={`${stat.bg} rounded-2xl p-4`}>
                        <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Student List */}
            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <Loader size={32} className="animate-spin text-blue-500" />
                </div>
            ) : students.length === 0 ? (
                <div className="text-center py-24 text-gray-400 dark:text-gray-500">
                    <User size={48} className="mx-auto mb-3 opacity-30" />
                    <p className="text-lg font-medium">No students found</p>
                    <p className="text-sm mt-1">Try a different search term</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {students.map(student => (
                        <StudentCard
                            key={student._id}
                            student={student}
                            onApprove={handleApprove}
                            onReject={handleReject}
                            processing={processing}
                        />
                    ))}
                </div>
            )}
        </motion.div>
    );
}
