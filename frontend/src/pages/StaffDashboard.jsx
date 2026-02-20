import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, XCircle, FileText, Clock, History, ExternalLink, TrendingUp, Users, AlertCircle, Loader } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';

const SERVER_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');

const STATUS_CONFIG = {
    approved: { label: 'Approved', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-500/15', icon: CheckCircle },
    rejected: { label: 'Rejected', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-500/15', icon: XCircle },
};

function Card({ children, className = '' }) {
    return (
        <div className={`rounded-2xl border border-gray-200 dark:border-white/5 bg-white dark:bg-[#151515] shadow-sm ${className}`}>
            {children}
        </div>
    );
}

export default function StaffDashboard() {
    const { user } = useAuth();
    const [history, setHistory] = useState([]);
    const [pending, setPending] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [rejectTarget, setRejectTarget] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [processing, setProcessing] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [histRes, pendRes] = await Promise.all([
                api.get('/staff/verification-history'),
                api.get('/staff/pending-documents')
            ]);
            setHistory(histRes.data);
            setPending(pendRes.data);
        } catch (err) {
            console.error('Failed to load staff data', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleApprove = async (studentId, docId) => {
        if (!confirm('Approve this document?')) return;
        setProcessing(docId);
        try {
            await api.put('/staff/verify-document', { studentId, documentId: docId, status: 'approved' });
            await fetchData();
        } catch (err) {
            alert('Failed to approve.');
        } finally {
            setProcessing(null);
        }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) return alert('Please provide a rejection reason.');
        setProcessing(rejectTarget.docId);
        try {
            await api.put('/staff/verify-document', {
                studentId: rejectTarget.studentId,
                documentId: rejectTarget.docId,
                status: 'rejected',
                rejectionReason: rejectReason
            });
            setRejectTarget(null);
            setRejectReason('');
            await fetchData();
        } catch (err) {
            alert('Failed to reject.');
        } finally {
            setProcessing(null);
        }
    };

    const approvedTotal = history.filter(h => h.status === 'approved').length;
    const rejectedTotal = history.filter(h => h.status === 'rejected').length;
    const pendingTotal = pending.reduce((acc, s) => acc + s.documents.length, 0);
    const today = new Date().toDateString();
    const verifiedToday = history.filter(h => new Date(h.updatedAt).toDateString() === today).length;

    const stats = [
        { label: 'Students In Queue', value: pending.length, icon: Clock, color: 'text-orange-500', bg: 'bg-orange-500/10' },
        { label: 'Docs Pending Review', value: pendingTotal, icon: FileText, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { label: 'Approved Total', value: approvedTotal, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
        { label: 'Rejected Total', value: rejectedTotal, icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
        { label: 'Verified Today', value: verifiedToday, icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-500/10' },
        { label: 'Total Actions', value: history.length, icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    ];

    const filteredHistory = filterStatus === 'all'
        ? history
        : history.filter(h => h.status === filterStatus);

    if (loading) return (
        <div className="flex items-center justify-center h-96">
            <Loader size={36} className="animate-spin text-blue-500" />
        </div>
    );

    return (
        <motion.div
            className="space-y-8 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            {/* Header */}
            <div className="backdrop-blur-sm bg-white/70 dark:bg-black/20 p-6 rounded-3xl border border-gray-200 dark:border-white/5 shadow-md">
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-1">
                    Staff Dashboard
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Welcome back, <span className="font-semibold text-blue-600 dark:text-neon-blue">{user?.name}</span>.
                    Here's your real-time document verification overview.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {stats.map((stat, idx) => (
                    <Card key={idx} className="p-4">
                        <div className={`inline-flex p-2.5 rounded-xl ${stat.bg} ${stat.color} mb-3`}>
                            <stat.icon size={20} />
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">{stat.label}</p>
                    </Card>
                ))}
            </div>

            {/* Pending Queue */}
            {pending.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Clock className="text-orange-500" size={22} />
                        Verification Queue
                        <span className="text-sm bg-orange-100 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 px-2.5 py-0.5 rounded-full font-semibold">
                            {pending.length} student{pending.length !== 1 ? 's' : ''}
                        </span>
                    </h2>
                    <div className="grid gap-5">
                        {pending.map(student => (
                            <Card key={student._id} className="overflow-hidden">
                                {/* Student Header */}
                                <div className="p-5 bg-gray-50 dark:bg-white/[0.03] border-b border-gray-100 dark:border-white/5 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                                        {student.name?.charAt(0)?.toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-gray-900 dark:text-white">{student.name}</p>
                                        <p className="text-xs text-gray-500">{student.email}</p>
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0 flex-wrap">
                                        {student.branch && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400">{student.branch}</span>}
                                        {student.year && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400">Year {student.year}</span>}
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400">
                                            {student.documents.length} awaiting
                                        </span>
                                    </div>
                                </div>

                                {/* Documents */}
                                <div className="divide-y divide-gray-100 dark:divide-white/5">
                                    {student.documents.map(doc => {
                                        const isRejectOpen = rejectTarget?.docId === doc._id;
                                        const isLoading = processing === doc._id;
                                        return (
                                            <div key={doc._id} className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-500">
                                                        <FileText size={16} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-sm text-gray-900 dark:text-white">{doc.type}</p>
                                                        <p className="text-xs text-gray-500 truncate">{doc.originalName}</p>
                                                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                                            <Clock size={10} /> {new Date(doc.updatedAt || doc.createdAt).toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                                                    {doc.fileUrl && (
                                                        <button
                                                            onClick={() => window.open(`${SERVER_URL}${doc.fileUrl}`, '_blank')}
                                                            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10"
                                                        >
                                                            <ExternalLink size={11} /> View
                                                        </button>
                                                    )}
                                                    {!isRejectOpen ? (
                                                        <>
                                                            <button
                                                                onClick={() => handleApprove(student._id, doc._id)}
                                                                disabled={isLoading}
                                                                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-500 hover:bg-green-600 text-white rounded-lg transition disabled:opacity-50"
                                                            >
                                                                {isLoading ? <Loader size={11} className="animate-spin" /> : <CheckCircle size={11} />} Approve
                                                            </button>
                                                            <button
                                                                onClick={() => { setRejectTarget({ studentId: student._id, docId: doc._id }); setRejectReason(''); }}
                                                                disabled={isLoading}
                                                                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-500 hover:bg-red-600 text-white rounded-lg transition disabled:opacity-50"
                                                            >
                                                                <XCircle size={11} /> Reject
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <div className="flex gap-2 items-center flex-wrap">
                                                            <input
                                                                autoFocus
                                                                className="text-xs border border-gray-300 dark:border-white/10 rounded-lg px-3 py-1.5 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white w-52 focus:outline-none focus:border-red-500"
                                                                placeholder="Reason for rejection..."
                                                                value={rejectReason}
                                                                onChange={e => setRejectReason(e.target.value)}
                                                                onKeyDown={e => e.key === 'Enter' && handleReject()}
                                                            />
                                                            <button onClick={handleReject} disabled={!rejectReason.trim() || isLoading}
                                                                className="px-3 py-1.5 text-xs bg-red-500 hover:bg-red-600 text-white rounded-lg disabled:opacity-50">
                                                                {isLoading ? <Loader size={11} className="animate-spin" /> : 'Confirm'}
                                                            </button>
                                                            <button onClick={() => setRejectTarget(null)}
                                                                className="px-3 py-1.5 text-xs bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg">
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {pending.length === 0 && (
                <Card className="text-center py-16 border-dashed border-2 border-gray-200 dark:border-white/10 bg-transparent shadow-none">
                    <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-500/5 flex items-center justify-center mb-4 mx-auto">
                        <CheckCircle size={32} className="text-green-500" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Queue is Clear!</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">No pending document submissions right now.</p>
                </Card>
            )}

            {/* Verification History Log */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <History className="text-purple-500" size={22} />
                        Verification History
                        <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">({filteredHistory.length} records)</span>
                    </h2>
                    {/* Filter Tabs */}
                    <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl gap-1">
                        {[
                            { key: 'all', label: `All (${history.length})` },
                            { key: 'approved', label: `✅ Approved (${approvedTotal})` },
                            { key: 'rejected', label: `❌ Rejected (${rejectedTotal})` },
                        ].map(f => (
                            <button
                                key={f.key}
                                onClick={() => setFilterStatus(f.key)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterStatus === f.key
                                    ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5">
                                <tr>
                                    <th className="px-5 py-4 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">Date & Time</th>
                                    <th className="px-5 py-4 font-semibold text-gray-600 dark:text-gray-300">Student</th>
                                    <th className="px-5 py-4 font-semibold text-gray-600 dark:text-gray-300">Document</th>
                                    <th className="px-5 py-4 font-semibold text-gray-600 dark:text-gray-300">Status</th>
                                    <th className="px-5 py-4 font-semibold text-gray-600 dark:text-gray-300">Reason</th>
                                    <th className="px-5 py-4 font-semibold text-gray-600 dark:text-gray-300">File</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                {filteredHistory.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-5 py-16 text-center text-gray-400">
                                            No {filterStatus !== 'all' ? filterStatus : ''} records found yet.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredHistory.map((log, i) => {
                                        const cfg = STATUS_CONFIG[log.status] || {};
                                        const Icon = cfg.icon || FileText;
                                        return (
                                            <tr key={`${log.docId}-${i}`} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                                                <td className="px-5 py-4 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                                                    {log.updatedAt ? new Date(log.updatedAt).toLocaleString() : '—'}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <p className="font-semibold text-gray-900 dark:text-white">{log.studentName}</p>
                                                    <p className="text-xs text-gray-500">{log.studentEmail}</p>
                                                    <div className="flex gap-1 mt-0.5 flex-wrap">
                                                        {log.studentBranch && <span className="text-xs text-blue-500">{log.studentBranch}</span>}
                                                        {log.studentYear && <span className="text-xs text-gray-400">• Year {log.studentYear}</span>}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <p className="font-medium text-gray-800 dark:text-gray-200">{log.docType}</p>
                                                    <p className="text-xs text-gray-400 truncate max-w-[140px]">{log.originalName}</p>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color} ${cfg.bg}`}>
                                                        <Icon size={11} />
                                                        {cfg.label}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 max-w-[200px]">
                                                    {log.rejectionReason ? (
                                                        <span className="text-xs text-red-500 dark:text-red-400 flex items-start gap-1">
                                                            <AlertCircle size={11} className="mt-0.5 flex-shrink-0" />
                                                            {log.rejectionReason}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 italic">—</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4">
                                                    {log.fileUrl ? (
                                                        <button
                                                            onClick={() => window.open(`${SERVER_URL}${log.fileUrl}`, '_blank')}
                                                            className="flex items-center gap-1 text-xs text-blue-500 dark:text-blue-400 hover:underline"
                                                        >
                                                            <ExternalLink size={12} /> View
                                                        </button>
                                                    ) : <span className="text-xs text-gray-400">—</span>}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </motion.div>
    );
}
