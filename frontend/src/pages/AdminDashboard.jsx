import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Card, Button, Badge } from '../components/UI';
import { TrendingUp, Download, MessageSquare, BarChart2, Activity, Clock, Users, DollarSign, FileText, CheckCircle, Home } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminDashboard() {
    const { allStudents, fetchHostelApplications, approveRejectHostel, fetchAllPayments } = useData();
    const { user } = useAuth();

    const [hostelApps, setHostelApps] = useState([]);
    const [hostelLoading, setHostelLoading] = useState(false);
    const [rejectingId, setRejectingId] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [actionLoading, setActionLoading] = useState(null);
    const [payments, setPayments] = useState([]);
    const [paymentsLoading, setPaymentsLoading] = useState(false);

    useEffect(() => {
        const load = async () => {
            setHostelLoading(true);
            const apps = await fetchHostelApplications();
            setHostelApps(apps);
            setHostelLoading(false);

            setPaymentsLoading(true);
            const paymentData = await fetchAllPayments();
            setPayments(paymentData);
            setPaymentsLoading(false);
        };
        load();
    }, []);

    const handleHostelAction = async (studentId, status) => {
        setActionLoading(studentId + status);
        await approveRejectHostel(studentId, status, rejectReason);
        const apps = await fetchHostelApplications();
        setHostelApps(apps);
        setRejectingId(null);
        setRejectReason('');
        setActionLoading(null);
    };

    const students = allStudents.filter(s => s.role === 'student');
    const totalStudents = students.length;

    // Calculate Stats
    let totalFeesRemaining = 0;
    let totalDocsPending = 0;
    let totalRevenue = 0;
    const deptCounts = {};

    students.forEach(s => {
        const d = s.data || {};

        // Fee Split
        const total = d.fee?.totalAmount || 50000;
        const paid = d.fee?.paidAmount || 0;
        totalFeesRemaining += (total - paid);
        totalRevenue += paid;

        // Docs Pending (Count individual files)
        const files = d.documents?.files || {};
        const pendingFiles = Object.values(files).filter(f => f.status === 'submitted' || f.status === 'pending').length;
        totalDocsPending += pendingFiles;

        // Dept Count
        const branch = s.branch || 'Unknown';
        deptCounts[branch] = (deptCounts[branch] || 0) + 1;
    });

    // Sort Depts
    const sortedDepts = Object.entries(deptCounts).sort((a, b) => b[1] - a[1]);
    const maxDeptCount = sortedDepts.length > 0 ? sortedDepts[0][1] : 1;

    const completed = students.filter(s => {
        const data = s.data || {};
        return data.documents?.status === 'approved' &&
            data.fee?.status === 'paid' &&
            data.hostel?.status === 'approved' &&
            data.lms?.status === 'active';
    }).length;

    const stats = [
        { label: 'Total Students', value: totalStudents, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { label: 'Revenue Collected', value: `₹${(totalRevenue / 1000).toFixed(1)}k`, icon: DollarSign, color: 'text-green-500', bg: 'bg-green-500/10' },
        { label: 'Docs to Verify', value: totalDocsPending, icon: FileText, color: 'text-orange-500', bg: 'bg-orange-500/10' },
        { label: 'Onboarding Done', value: completed, icon: CheckCircle, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    ];

    // const { user } = useAuth(); // Duplicated

    // Analytics Data (Static/Mocked replaced by dynamic above)
    /* 
    const statsMock = [
        { label: 'Avg Doc Approval Time', value: '1.2 Days', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { label: 'Fee Collection Trend', value: '+12%', icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-500/10' },
        { label: 'Hostel Occupancy', value: '85%', icon: Activity, color: 'text-orange-500', bg: 'bg-orange-500/10' },
        { label: 'Chatbot Queries', value: '1.5k', icon: MessageSquare, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    ]; 
    */

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
            {/* Header */}
            <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between gap-6 backdrop-blur-sm bg-white/70 dark:bg-black/20 p-6 rounded-3xl border border-gray-200 dark:border-white/5 shadow-md">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-2">
                        Admin Overview
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        Welcome back, <span className="font-semibold text-blue-600 dark:text-neon-blue">{user?.name}</span>.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="secondary" size="sm" className="hidden md:flex">
                        <Download size={16} /> Export Reports
                    </Button>
                </div>
            </motion.div>

            {/* Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, idx) => (
                    <motion.div variants={item} key={idx}>
                        <Card className="p-6 border-t-4 border-transparent hover:border-blue-500 transition-all shadow-md hover:shadow-lg bg-white dark:bg-[#151515]">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                                    <stat.icon size={24} />
                                </div>
                                {idx === 1 && <span className="text-green-500 text-xs font-bold">+5% vs last week</span>}
                            </div>
                            <div>
                                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{stat.value}</h2>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                            </div>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Graphs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div variants={item} className="bg-white dark:bg-[#111] rounded-3xl border border-gray-200 dark:border-white/5 shadow-xl p-6 h-96 flex flex-col items-center justify-center relative overflow-hidden">
                    <h3 className="absolute top-6 left-6 text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <BarChart2 size={20} className="text-green-500" />
                        Fee Collection
                    </h3>
                    <div className="text-center text-gray-400 z-10">
                        <BarChart2 size={48} className="mx-auto mb-4 opacity-50 text-green-500" />
                        <p className="max-w-xs mx-auto">Fee collection has increased by 12% compared to last semester.</p>
                    </div>
                    {/* Decorative bg element */}
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-green-500/5 rounded-full blur-3xl"></div>
                </motion.div>

                <motion.div variants={item} className="bg-white dark:bg-[#111] rounded-3xl border border-gray-200 dark:border-white/5 shadow-xl p-6 h-96 flex flex-col items-center justify-center relative overflow-hidden">
                    <h3 className="absolute top-6 left-6 text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Activity size={20} className="text-orange-500" />
                        Hostel Heatmap
                    </h3>
                    <div className="text-center text-gray-400 z-10">
                        <div className="grid grid-cols-3 gap-2 mb-4">
                            {[...Array(9)].map((_, i) => (
                                <div key={i} className={`w-8 h-8 rounded ${i % 2 === 0 ? 'bg-orange-500/40' : 'bg-orange-500/10'}`}></div>
                            ))}
                        </div>
                        <p className="max-w-xs mx-auto text-sm">Block A - Boys Hostel has the highest occupancy rate at 92%.</p>
                    </div>
                    {/* Decorative bg element */}
                    <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-orange-500/5 rounded-full blur-3xl"></div>
                </motion.div>
            </div>

            {/* Hostel Applications */}
            <motion.div variants={item} className="bg-white dark:bg-[#111] rounded-3xl border border-gray-200 dark:border-white/5 shadow-xl overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-white/5 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Home size={20} className="text-orange-500" />
                        Hostel Applications
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 px-2 py-1 rounded-full font-semibold">
                        {hostelApps.filter(a => a.hostel?.status === 'pending').length} Pending
                    </span>
                </div>

                <div className="overflow-x-auto">
                    {hostelLoading ? (
                        <div className="flex items-center justify-center py-12 text-gray-400">
                            <Clock size={24} className="animate-spin mr-2" /> Loading applications...
                        </div>
                    ) : hostelApps.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            No hostel applications yet.
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/5">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Student</th>
                                    <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Hostel Type</th>
                                    <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Room Type</th>
                                    <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Status</th>
                                    <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                {hostelApps.map((app) => (
                                    <tr key={app.studentId} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">{app.name}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{app.branch} • {app.email}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-gray-700 dark:text-gray-300">
                                                {app.hostel?.gender === 'Male' ? '👨 Boys' : '👩 Girls'} Hostel
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="capitalize text-gray-700 dark:text-gray-300">
                                                {app.hostel?.roomType === 'single' ? '🛏️ Single' :
                                                    app.hostel?.roomType === 'double' ? '🛏🛏 Double' :
                                                        app.hostel?.roomType === 'triple' ? '🛏🛏🛏 Triple' : '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {app.hostel?.status === 'pending' && (
                                                <span className="px-2 py-1 text-xs font-bold rounded-full bg-yellow-100 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-500/20">⏳ PENDING</span>
                                            )}
                                            {app.hostel?.status === 'approved' && (
                                                <span className="px-2 py-1 text-xs font-bold rounded-full bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-500/20">✅ APPROVED</span>
                                            )}
                                            {app.hostel?.status === 'rejected' && (
                                                <span className="px-2 py-1 text-xs font-bold rounded-full bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20">❌ REJECTED</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {app.hostel?.status === 'pending' && (
                                                <div className="flex flex-col items-end gap-2">
                                                    {rejectingId === app.studentId ? (
                                                        <div className="flex flex-col items-end gap-2 w-full max-w-xs">
                                                            <input
                                                                type="text"
                                                                placeholder="Reason for rejection..."
                                                                value={rejectReason}
                                                                onChange={e => setRejectReason(e.target.value)}
                                                                className="w-full text-xs px-3 py-2 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-red-400"
                                                            />
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => { setRejectingId(null); setRejectReason(''); }}
                                                                    className="text-xs px-3 py-1 rounded-lg border border-gray-200 dark:border-white/10 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"
                                                                >Cancel</button>
                                                                <button
                                                                    onClick={() => handleHostelAction(app.studentId, 'rejected')}
                                                                    disabled={actionLoading === app.studentId + 'rejected'}
                                                                    className="text-xs px-3 py-1 rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                                                                >{actionLoading === app.studentId + 'rejected' ? '...' : 'Confirm Reject'}</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handleHostelAction(app.studentId, 'approved')}
                                                                disabled={actionLoading === app.studentId + 'approved'}
                                                                className="text-xs px-3 py-1.5 rounded-lg bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/30 hover:bg-green-200 dark:hover:bg-green-500/30 disabled:opacity-50 font-semibold"
                                                            >{actionLoading === app.studentId + 'approved' ? '...' : '✅ Approve'}</button>
                                                            <button
                                                                onClick={() => setRejectingId(app.studentId)}
                                                                className="text-xs px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/30 hover:bg-red-200 dark:hover:bg-red-500/30 font-semibold"
                                                            >❌ Reject</button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {app.hostel?.status !== 'pending' && (
                                                <span className="text-xs text-gray-400 italic">No action needed</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </motion.div>

            {/* Payment Transactions */}
            <motion.div variants={item} className="bg-white dark:bg-[#111] rounded-3xl border border-gray-200 dark:border-white/5 shadow-xl overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-white/5 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <DollarSign size={20} className="text-green-500" />
                        Payment Transactions
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-1 rounded-full font-semibold">
                        {payments.length} Total
                    </span>
                </div>

                <div className="overflow-x-auto max-h-[500px]">
                    {paymentsLoading ? (
                        <div className="flex items-center justify-center py-12 text-gray-400">
                            <Clock size={24} className="animate-spin mr-2" /> Loading transactions...
                        </div>
                    ) : payments.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            No payment transactions yet.
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/5 sticky top-0 backdrop-blur-md">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Date</th>
                                    <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Student</th>
                                    <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Amount</th>
                                    <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Transaction ID</th>
                                    <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Order ID</th>
                                    <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                {payments.map((payment, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="text-gray-700 dark:text-gray-300">
                                                <p className="font-medium">{new Date(payment.date).toLocaleDateString('en-IN')}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(payment.date).toLocaleTimeString('en-IN')}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">{payment.studentName}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{payment.branch} • Year {payment.year}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-green-600 dark:text-green-400">₹{payment.amount.toLocaleString()}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <code className="text-xs bg-gray-100 dark:bg-white/5 px-2 py-1 rounded text-gray-700 dark:text-gray-300">
                                                {payment.transactionId}
                                            </code>
                                        </td>
                                        <td className="px-6 py-4">
                                            <code className="text-xs bg-gray-100 dark:bg-white/5 px-2 py-1 rounded text-gray-700 dark:text-gray-300">
                                                {payment.orderId}
                                            </code>
                                        </td>
                                        <td className="px-6 py-4">
                                            {payment.status === 'paid' && (
                                                <Badge variant="success">PAID</Badge>
                                            )}
                                            {payment.status === 'partial' && (
                                                <Badge variant="warning">PARTIAL</Badge>
                                            )}
                                            {payment.status === 'pending' && (
                                                <Badge variant="default">PENDING</Badge>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
