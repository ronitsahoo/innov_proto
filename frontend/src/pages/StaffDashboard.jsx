import { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Input, Badge } from '../components/UI';
import { CheckCircle, XCircle, FileText, Clock, UserCheck, Search, Filter, History, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function StaffDashboard() {
    const { allStudents, updateStudentStatus } = useData();
    const { user } = useAuth();
    const [rejectReason, setRejectReason] = useState('');
    const [rejectTarget, setRejectTarget] = useState(null); // { id: studentId, file: fileName }
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('queue'); // 'queue' or 'history'
    const [expandedHistory, setExpandedHistory] = useState(null);

    // Get students with AT LEAST one pending/submitted file
    const pendingDocsQueue = allStudents.filter(s => {
        if (s.role !== 'student') return false;
        const files = s.data?.documents?.files || {};
        // We want to see files that are 'submitted' (ready for review)
        // If status is 'pending', the student hasn't uploaded yet (or hasn't clicked submit if that concept existed, but here upload sets to submitted)
        // Check StudentModules.jsx: upload sets status to 'submitted'.
        return Object.values(files).some(f => f.status === 'submitted');
    });

    const verificationHistory = allStudents
        .filter(s => s.role === 'student' && s.verificationHistory?.length > 0)
        .flatMap(s => s.verificationHistory.map(h => ({ ...h, studentName: s.name, studentEmail: s.email, studentId: s.id })))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    // Stats
    const stats = [
        { label: 'Pending Requests', value: pendingDocsQueue.length, icon: Clock, color: 'text-orange-500', bg: 'bg-orange-500/10' },
        { label: 'Verified Today', value: verificationHistory.filter(h => new Date(h.date).toDateString() === new Date().toDateString()).length, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
        { label: 'Total Students', value: allStudents.filter(s => s.role === 'student').length, icon: UserCheck, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    ];

    const handleApprove = (studentId, fileKey) => {
        if (confirm(`Approve ${fileKey}?`)) {
            updateStudentStatus(studentId, 'documents', 'approved', null, fileKey);
        }
    };

    const handleReject = () => {
        if (!rejectReason) return alert('Please provide a reason');
        updateStudentStatus(rejectTarget.id, 'documents', 'rejected', rejectReason, rejectTarget.file);
        setRejectTarget(null);
        setRejectReason('');
    };

    const openRejectDialog = (studentId, fileKey) => {
        setRejectTarget({ id: studentId, file: fileKey });
        setRejectReason('');
    };

    return (
        <motion.div
            className="space-y-8 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 backdrop-blur-sm bg-white/70 dark:bg-black/20 p-6 rounded-3xl border border-gray-200 dark:border-white/5 shadow-md">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-2">
                        Staff Dashboard
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        Managing verifications for <span className="font-semibold text-blue-600 dark:text-neon-blue">{user?.name}</span>.
                    </p>
                </div>
                <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
                    <button
                        onClick={() => setViewMode('queue')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'queue' ? 'bg-white dark:bg-white/10 text-blue-600 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900'}`}
                    >
                        Verification Queue
                    </button>
                    <button
                        onClick={() => setViewMode('history')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'history' ? 'bg-white dark:bg-white/10 text-blue-600 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900'}`}
                    >
                        History Log
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, idx) => (
                    <Card key={idx} className="p-6 flex items-center justify-between bg-white dark:bg-[#151515]">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
                        </div>
                        <div className={`p-4 rounded-xl ${stat.bg} ${stat.color}`}>
                            <stat.icon size={24} />
                        </div>
                    </Card>
                ))}
            </div>

            {/* Main Content */}
            <AnimatePresence mode="wait">
                {viewMode === 'queue' ? (
                    <motion.div
                        key="queue"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                    >
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <FileText className="text-blue-500" />
                                Pending Documents
                                <span className="text-xs bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full">{pendingDocsQueue.length} Students</span>
                            </h2>
                            {/* Search Bar could go here */}
                        </div>

                        {pendingDocsQueue.length === 0 ? (
                            <Card className="text-center py-20 flex flex-col items-center justify-center border-dashed border-2 border-gray-200 dark:border-white/10 bg-transparent shadow-none">
                                <div className="w-20 h-20 rounded-full bg-green-50 dark:bg-green-500/5 flex items-center justify-center mb-4">
                                    <CheckCircle size={40} className="text-green-500" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">All Caught Up!</h3>
                                <p className="text-gray-500 dark:text-gray-400">No pending document submissions.</p>
                            </Card>
                        ) : (
                            <div className="grid gap-6">
                                {pendingDocsQueue.map((student) => (
                                    <Card key={student.id} className="overflow-hidden border-none shadow-md bg-white dark:bg-[#151515]">
                                        <div className="p-6 border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 flex justify-between items-start">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                                                    {student.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{student.name}</h3>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">{student.email}</p>
                                                    <div className="mt-1 flex gap-2">
                                                        <span className="text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-300">ID: {student.id}</span>
                                                        <span className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">{student.branch || 'General'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="divide-y divide-gray-100 dark:divide-white/5">
                                            {Object.entries(student.data?.documents?.files || {}).filter(([_, f]) => f.status === 'submitted').map(([docName, fileData]) => (
                                                <div key={docName} className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                                    <div className="flex items-center gap-4 w-full sm:w-auto">
                                                        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                                            <FileText size={24} />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-gray-900 dark:text-white">{docName}</p>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                                <Clock size={12} /> Uploaded: {new Date(fileData.uploadedAt).toLocaleDateString()}
                                                            </p>
                                                            <p className="text-xs text-blue-500 mt-1">{fileData.file}</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                                        {rejectTarget?.id === student.id && rejectTarget?.file === docName ? (
                                                            <div className="flex flex-col sm:flex-row gap-2 w-full animate-in fade-in zoom-in duration-200">
                                                                <Input
                                                                    placeholder="Reason..."
                                                                    value={rejectReason}
                                                                    onChange={(e) => setRejectReason(e.target.value)}
                                                                    className="w-full sm:w-48"
                                                                    autoFocus
                                                                />
                                                                <div className="flex gap-2">
                                                                    <Button variant="danger" size="sm" onClick={handleReject}>Confirm</Button>
                                                                    <Button variant="secondary" size="sm" onClick={() => setRejectTarget(null)}>Cancel</Button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <Button variant="secondary" size="sm">View</Button>
                                                                <Button className="bg-green-500 hover:bg-green-600 text-white border-green-600" size="sm" onClick={() => handleApprove(student.id, docName)}>
                                                                    <CheckCircle size={16} /> Approve
                                                                </Button>
                                                                <Button variant="danger" size="sm" onClick={() => openRejectDialog(student.id, docName)}>
                                                                    <XCircle size={16} /> Reject
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        key="history"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                    >
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <History className="text-purple-500" />
                                Verification History
                            </h2>
                        </div>

                        <Card className="overflow-hidden border-none shadow-md bg-white dark:bg-[#151515]">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/5">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Date</th>
                                            <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Student</th>
                                            <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Document</th>
                                            <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Action</th>
                                            <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Reason</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                        {verificationHistory.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="px-6 py-12 text-center text-gray-500">No history found.</td>
                                            </tr>
                                        ) : (
                                            verificationHistory.map((log, i) => (
                                                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                                        {new Date(log.date).toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-medium text-gray-900 dark:text-white">{log.studentName}</div>
                                                        <div className="text-xs text-gray-500">{log.studentEmail}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{log.file}</td>
                                                    <td className="px-6 py-4">
                                                        <Badge variant={log.status === 'approved' ? 'success' : 'danger'}>
                                                            {log.status.toUpperCase()}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 italic">
                                                        {log.reason || '-'}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
