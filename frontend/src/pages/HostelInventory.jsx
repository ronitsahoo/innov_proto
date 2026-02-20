import { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { Settings } from 'lucide-react';
import { motion } from 'framer-motion';

export default function HostelInventory() {
    const { fetchAdminSettings, updateHostelRooms } = useData();

    // Hostel rooms state — 6 combos: 2 genders × 3 types
    const ROOM_COMBOS = [
        { gender: 'Male', roomType: 'single', label: '👨 Boys — Single Room' },
        { gender: 'Male', roomType: 'double', label: '👨 Boys — Double Sharing' },
        { gender: 'Male', roomType: 'triple', label: '👨 Boys — Triple Sharing' },
        { gender: 'Female', roomType: 'single', label: '👩 Girls — Single Room' },
        { gender: 'Female', roomType: 'double', label: '👩 Girls — Double Sharing' },
        { gender: 'Female', roomType: 'triple', label: '👩 Girls — Triple Sharing' },
    ];
    const [roomCounts, setRoomCounts] = useState(
        Object.fromEntries(ROOM_COMBOS.map(c => [`${c.gender}_${c.roomType}`, 0]))
    );
    const [roomsLoading, setRoomsLoading] = useState(false);
    const [roomsSaved, setRoomsSaved] = useState(false);

    useEffect(() => {
        const load = async () => {
            const settings = await fetchAdminSettings();
            if (settings) {
                const savedRooms = {};
                (settings.hostelRooms || []).forEach(r => {
                    savedRooms[`${r.gender}_${r.roomType}`] = r.total;
                });
                setRoomCounts(prev => ({ ...prev, ...savedRooms }));
            }
        };
        load();
    }, [fetchAdminSettings]); // Added dependency

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
                        Hostel Room Inventory
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        Manage available rooms and capacity.
                    </p>
                </div>
            </motion.div>

            <motion.div variants={item} className="bg-white dark:bg-[#111] rounded-3xl border border-gray-200 dark:border-white/5 shadow-xl overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-white/5 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Settings size={20} className="text-teal-500" />
                        Detail Inventory
                    </h3>
                    <span className="text-xs text-gray-400">Set total rooms per type</span>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {ROOM_COMBOS.map(combo => {
                            const key = `${combo.gender}_${combo.roomType}`;
                            return (
                                <div key={key} className="bg-gray-50 dark:bg-white/5 rounded-2xl p-4 border border-gray-100 dark:border-white/5">
                                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">{combo.label}</p>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setRoomCounts(prev => ({ ...prev, [key]: Math.max(0, (prev[key] || 0) - 1) }))}
                                            className="w-8 h-8 rounded-full bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-white/20 font-bold text-lg flex items-center justify-center transition-colors"
                                        >−</button>
                                        <input
                                            type="number"
                                            min="0"
                                            value={roomCounts[key] || 0}
                                            onChange={e => setRoomCounts(prev => ({ ...prev, [key]: Math.max(0, parseInt(e.target.value) || 0) }))}
                                            className="w-16 text-center text-lg font-bold text-gray-800 dark:text-gray-100 bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-lg py-1 focus:outline-none focus:ring-1 focus:ring-teal-400"
                                        />
                                        <button
                                            onClick={() => setRoomCounts(prev => ({ ...prev, [key]: (prev[key] || 0) + 1 }))}
                                            className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-400 hover:bg-teal-200 dark:hover:bg-teal-500/30 font-bold text-lg flex items-center justify-center transition-colors"
                                        >+</button>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-2">rooms total</p>
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-6 flex justify-end">
                        <button
                            disabled={roomsLoading}
                            onClick={async () => {
                                setRoomsLoading(true);
                                const rooms = ROOM_COMBOS.map(c => ({
                                    gender: c.gender,
                                    roomType: c.roomType,
                                    total: roomCounts[`${c.gender}_${c.roomType}`] || 0,
                                    available: roomCounts[`${c.gender}_${c.roomType}`] || 0
                                }));
                                await updateHostelRooms(rooms);
                                setRoomsSaved(true);
                                setRoomsLoading(false);
                                setTimeout(() => setRoomsSaved(false), 2000);
                            }}
                            className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm disabled:opacity-50 transition-colors flex items-center gap-2"
                        >
                            {roomsLoading ? '⏳ Saving...' : roomsSaved ? '✅ Saved!' : '💾 Save Room Inventory'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
