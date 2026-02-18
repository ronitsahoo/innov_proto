import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
    const { user } = useAuth();
    const [studentData, setStudentData] = useState(null);
    const [allStudents, setAllStudents] = useState([]);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (!user) {
            setStudentData(null);
            setAllStudents([]);
            setProgress(0);
            return;
        }

        if (user.role === 'student') {
            loadStudentData(user.id);
        } else if (user.role === 'admin' || user.role === 'staff') {
            loadAllStudents();
        }
    }, [user]);

    const loadStudentData = (id) => {
        const allData = JSON.parse(localStorage.getItem('studentsData') || '{}');
        const data = allData[id] || {
            // Updated Structure Fallback
            documents: { status: 'pending', files: {} },
            fee: { status: 'unpaid', totalAmount: 50000, paidAmount: 0, history: [] },
            hostel: { status: 'not_applied', room: null },
            lms: { status: 'inactive', registeredCourses: [] },
            notifications: [],
            chatHistory: []
        };
        setStudentData(data);
        calculateProgress(data);
    };

    const loadAllStudents = () => {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const allData = JSON.parse(localStorage.getItem('studentsData') || '{}');

        const combined = users.map(u => ({
            ...u,
            data: allData[u.id] || {}
        }));
        setAllStudents(combined);
    };

    const calculateProgress = (data) => {
        let completed = 0;
        let total = 4; // Total Modules

        // Documents: Check if all critical documents are uploaded
        const docFiles = data.documents?.files || {};
        const pendingDocs = Object.values(docFiles).filter(d => d.status !== 'approved');
        // Simple Logic: if main status is approved OR no files pending (if files exist)
        if (data.documents?.status === 'approved') completed++;

        // Fee: Check if fully paid
        if (data.fee?.status === 'paid' || data.fee?.paidAmount >= data.fee?.totalAmount) completed++;

        // Hostel: If Applied/Allocated or Opted Out (for now just allocated)
        if (data.hostel?.status === 'allocated' || data.hostel?.status === 'approved') completed++;

        // LMS: If Active
        if (data.lms?.status === 'active') completed++;

        setProgress((completed / total) * 100);
    };

    const updateModuleStatus = (moduleName, newData) => {
        if (!user || user.role !== 'student') return;

        const allData = JSON.parse(localStorage.getItem('studentsData') || '{}');
        const currentData = allData[user.id] || {};

        // Deep merge for specific modules if needed, or replace
        if (moduleName === 'documents') {
            currentData.documents = {
                ...currentData.documents,
                ...newData,
                files: { ...currentData.documents.files, ...newData.files } // Merge files status
            };
            // Check overall status
            const allFiles = Object.values(currentData.documents.files);
            const allUploaded = allFiles.every(f => f.file !== null);
            if (allUploaded && currentData.documents.status === 'pending') {
                // Keep pending until staff approves, but maybe mark as 'submitted' locally?
            }
        }
        else if (moduleName === 'fee') {
            currentData.fee = { ...currentData.fee, ...newData };
            if (currentData.fee.paidAmount >= currentData.fee.totalAmount) {
                currentData.fee.status = 'paid';
            } else {
                currentData.fee.status = 'partial';
            }
        }
        else if (moduleName === 'hostel') {
            currentData.hostel = { ...currentData.hostel, ...newData };
        }
        else if (moduleName === 'lms') {
            currentData.lms = { ...currentData.lms, ...newData };
        }
        else {
            currentData[moduleName] = { ...currentData[moduleName], ...newData };
        }

        allData[user.id] = currentData;
        localStorage.setItem('studentsData', JSON.stringify(allData));

        setStudentData(currentData);
        calculateProgress(currentData);
    };

    const addNotification = (message) => {
        if (!user || user.role !== 'student') return;

        const allData = JSON.parse(localStorage.getItem('studentsData') || '{}');
        const currentData = allData[user.id] || {};

        const notifications = currentData.notifications || [];
        notifications.unshift({ id: Date.now(), message, read: false, date: new Date().toISOString() });

        currentData.notifications = notifications;
        allData[user.id] = currentData;
        localStorage.setItem('studentsData', JSON.stringify(allData));
        setStudentData(currentData);
    };

    const updateStudentStatus = (studentId, moduleName, status, reason = null, fileKey = null) => {
        const allData = JSON.parse(localStorage.getItem('studentsData') || '{}');
        const student = allData[studentId];

        if (student) {
            // Document Verification Logic
            if (moduleName === 'documents') {
                if (fileKey) {
                    // Update specific file status
                    if (student.documents?.files?.[fileKey]) {
                        student.documents.files[fileKey].status = status;
                        if (status === 'rejected') {
                            // If rejected, remove the file so they can re-upload
                            student.documents.files[fileKey].file = null;
                        }
                    }

                    // Check if ALL files are approved to update main status
                    const allFiles = Object.values(student.documents.files);
                    const allApproved = allFiles.every(f => f.status === 'approved');

                    if (allApproved) {
                        student.documents.status = 'approved';
                    } else if (status === 'rejected') {
                        // If one is rejected, main status is pending or rejected? 
                        // Let's keep main status as pending as long as not all approved
                        // Or maybe 'rejected' if critical? Let's keep 'pending' so staff can see updates.
                        student.documents.status = 'pending';
                    }
                } else {
                    // Fallback to bulk update if no fileKey provided (legacy support)
                    student.documents.status = status;
                    student.documents.reason = reason;
                    if (status === 'approved') {
                        Object.keys(student.documents.files).forEach(key => {
                            student.documents.files[key].status = 'approved';
                        });
                    }
                }
            } else {
                student[moduleName] = { ...student[moduleName], status, reason };
            }

            // Add notification to student
            const notifications = student.notifications || [];
            let msg = `Your ${moduleName} status has been updated to ${status}.`;
            if (fileKey) msg = `Your document "${fileKey}" has been ${status}.`;
            if (reason) msg += ` Reason: ${reason}`;

            notifications.unshift({
                id: Date.now(),
                message: msg,
                read: false,
                date: new Date().toISOString()
            });
            student.notifications = notifications;

            // Log Verification History (New)
            if (moduleName === 'documents') {
                student.verificationHistory = student.verificationHistory || [];
                student.verificationHistory.unshift({
                    id: Date.now(),
                    file: fileKey || 'All Documents',
                    status: status,
                    reason: reason,
                    date: new Date().toISOString(),
                    admin: 'Staff' // Could pass staff name
                });
            }

            localStorage.setItem('studentsData', JSON.stringify(allData));
            loadAllStudents();
        }
    };

    return (
        <DataContext.Provider value={{
            studentData,
            allStudents,
            progress,
            updateModuleStatus,
            updateStudentStatus,
            addNotification
        }}>
            {children}
        </DataContext.Provider>
    );
};
