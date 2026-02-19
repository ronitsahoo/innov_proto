import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
    const { user } = useAuth();
    const [studentData, setStudentData] = useState(null);
    const [allStudents, setAllStudents] = useState([]);
    const [progress, setProgress] = useState(0);

    const formatStudentData = (backendData) => {
        if (!backendData) return null;

        // Documents
        const defaultDocs = ["10th Marksheet", "12th Marksheet", "ID Proof", "Transfer Certificate"];
        const files = {};
        let approvedCount = 0;

        defaultDocs.forEach(key => {
            const found = backendData.documents.find(d => d.type === key);
            if (found) {
                files[key] = {
                    id: found._id,
                    status: found.status,
                    file: found.fileUrl.split('/').pop(),
                    url: found.fileUrl,
                    reason: found.rejectionReason
                };
                if (found.status === 'approved') approvedCount++;
            } else {
                files[key] = { status: 'pending', file: null };
            }
        });

        // Fee
        const feeStatus = backendData.fee.status;
        const fee = {
            status: feeStatus,
            totalAmount: 50000,
            paidAmount: feeStatus === 'paid' ? 50000 : 0,
            history: feeStatus === 'paid' ? [{
                amount: 50000,
                date: backendData.fee.updatedAt || new Date().toISOString(),
                id: backendData.fee.transactionId
            }] : []
        };

        // Hostel
        const hostel = {
            status: backendData.hostel.status === 'not_applied' ? 'not_applied' : backendData.hostel.status,
            room: backendData.hostel.roomType || null,
            type: backendData.hostel.roomType ? (backendData.hostel.roomType.includes('Boys') ? 'Male' : 'Female') : null
        };

        // LMS
        const lms = {
            status: backendData.lmsActivated ? 'active' : 'inactive',
            registeredCourses: []
        };

        return {
            ...backendData,
            documents: { status: approvedCount === defaultDocs.length ? 'approved' : 'pending', files },
            fee,
            hostel,
            lms
        };
    };

    const fetchStudentData = useCallback(async () => {
        try {
            const { data } = await api.get('/student/profile');
            if (data) {
                const formatted = formatStudentData(data);
                setStudentData(formatted);
                setProgress(data.progressPercentage || 0);
            }
        } catch (error) {
            console.error("Failed to fetch profile", error);
        }
    }, []);

    const fetchAllStudents = useCallback(async () => {
        try {
            let endpoint = '/admin/students';
            if (user?.role === 'staff') endpoint = '/staff/pending-documents';

            const { data } = await api.get(endpoint);

            const transformed = data.map(profile => {
                if (!profile.userId) return null;

                return {
                    id: profile.userId._id,
                    name: profile.userId.name,
                    email: profile.userId.email,
                    role: profile.userId.role,
                    branch: profile.userId.branch,
                    year: profile.userId.year,
                    data: formatStudentData(profile)
                };
            }).filter(Boolean);

            setAllStudents(transformed);
        } catch (error) {
            console.error("Failed to fetch students", error);
        }
    }, [user?.role]);

    useEffect(() => {
        if (!user) {
            setStudentData(null);
            setAllStudents([]);
            setProgress(0);
            return;
        }
        if (user.role === 'student') fetchStudentData();
        else fetchAllStudents();
    }, [user, fetchStudentData, fetchAllStudents]);

    // ACTIONS
    const uploadDocument = async (type, file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);
        try {
            await api.post('/student/upload-document', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            await fetchStudentData();
            return true;
        } catch (error) {
            console.error(error);
            return false;
        }
    };

    const initiateFeePayment = async (amount) => {
        try {
            const { data: order } = await api.post('/payment/create-order', { amount });

            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_1DP5mmOlF5G5ag',
                amount: order.amount,
                currency: "INR",
                name: "ARIA University",
                description: "Tuition Fee Payment",
                order_id: order.id,
                handler: async function (response) {
                    try {
                        await api.post('/payment/verify', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        });
                        alert("Payment Successful!");
                        await fetchStudentData();
                    } catch (error) {
                        alert("Payment Verification Failed");
                    }
                },
                prefill: {
                    name: user?.name,
                    email: user?.email,
                },
                theme: {
                    color: "#3399cc"
                }
            };

            const rzp1 = new window.Razorpay(options);
            rzp1.open();
        } catch (error) {
            console.error("Payment init failed", error);
            alert("Could not initiate payment");
        }
    };

    const applyHostel = async (gender) => {
        try {
            await api.post('/student/apply-hostel', { roomType: gender });
            await fetchStudentData();
        } catch (error) {
            console.error(error);
        }
    };

    const activateLMS = async () => {
        try {
            await api.post('/student/activate-lms');
            await fetchStudentData();
        } catch (error) {
            console.error(error);
        }
    };

    // Legacy support for updateModuleStatus if components use it, redirect to actions
    const updateModuleStatus = (moduleName, newData) => {
        // This is a deprecated method in new architecture.
        // Try to map or ignore.
        console.warn("updateModuleStatus is deprecated. Use specific actions.");
    };

    // Legacy support / Staff Action
    const updateStudentStatus = async (studentId, moduleName, status, reason = null, fileKey = null) => {
        if (moduleName === 'documents' && fileKey) {
            // We need to find the document ID. 
            // allStudents contains the data.
            const student = allStudents.find(s => s.id === studentId);
            const docId = student?.data?.documents?.files?.[fileKey]?.id;

            if (docId) {
                try {
                    await api.put('/staff/verify-document', {
                        studentId,
                        documentId: docId,
                        status,
                        rejectionReason: reason
                    });
                    await fetchAllStudents(); // Refresh
                } catch (error) {
                    console.error("Verification failed", error);
                }
            } else {
                console.error("Document ID not found for verification");
            }
        }
    };

    return (
        <DataContext.Provider value={{
            studentData,
            allStudents,
            progress,
            fetchStudentData,
            fetchAllStudents,
            uploadDocument,
            initiateFeePayment,
            applyHostel,
            activateLMS,
            updateModuleStatus,
            updateStudentStatus
        }}>
            {children}
        </DataContext.Provider>
    );
};
