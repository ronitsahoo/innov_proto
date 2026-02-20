import { useState } from 'react';
import { useData } from '../context/DataContext';
import { Badge } from '../components/UI';
import { Users, Trash2, Search } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AllStudents() {
    const { allStudents, deleteStudent } = useData();
    const [searchTerm, setSearchTerm] = useState('');

    const students = allStudents.filter(s => s.role === 'student');
    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
            const success = await deleteStudent(id);
            if (success) alert('Student deleted successfully');
            else alert('Failed to delete student');
        }
    };

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
                        Student Directory
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        Manage all registered students.
                    </p>
                </div>
            </motion.div>

            <motion.div variants={item} className="bg-white dark:bg-[#111] rounded-3xl border border-gray-200 dark:border-white/5 shadow-xl overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Users size={20} className="text-blue-500 dark:text-neon-blue" />
                        All Students
                    </h3>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input
                                type="text"
                                placeholder="Search students..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-neon-blue w-32 md:w-64 text-gray-900 dark:text-white"
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/5">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Name</th>
                                <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Debts</th>
                                <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Docs Status</th>
                                <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                                        No students found.
                                    </td>
                                </tr>
                            ) : (
                                filteredStudents.map((student) => {
                                    const d = student.data || {};
                                    const feesUnpaid = (d.fee?.totalAmount || 50000) - (d.fee?.paidAmount || 0);
                                    const docStatus = d.documents?.status || 'pending';

                                    return (
                                        <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-white">
                                                        {student.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900 dark:text-white">{student.name}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">{student.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {feesUnpaid <= 0 ? (
                                                    <span className="text-green-600 dark:text-green-400 font-bold text-xs bg-green-50 dark:bg-green-500/10 px-2 py-1 rounded-full">Paid</span>
                                                ) : (
                                                    <span className="text-red-500 dark:text-red-400 font-bold text-xs">₹{feesUnpaid.toLocaleString()}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant={docStatus === 'approved' ? 'success' : docStatus === 'rejected' ? 'error' : 'warning'}>
                                                    {docStatus}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleDelete(student.id)}
                                                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded text-red-400 hover:text-red-600 transition-colors"
                                                    title="Delete Student"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </motion.div>
    );
}
