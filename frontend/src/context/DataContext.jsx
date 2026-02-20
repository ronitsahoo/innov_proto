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

    const formatStudentData = (backendData, requiredDocsList) => {
        if (!backendData) return null;

        // Documents
        const defaultDocs = [
            "10th Marksheet",
            "12th Marksheet",
            "Diploma Marksheet",
            "Aadhaar Card",
            "PAN Card",
            "Transfer Certificate",
            "Caste Certificate",
            "Income Certificate",
            "Migration Certificate",
            "Passport Photo",
            "Signature"
        ];
        // Use provided list or empty if none (Admin should configure them)
        const requiredDocs = requiredDocsList || [];
        const files = {};
        let approvedCount = 0;
        let submittedCount = 0;

        // Iterate over the REQUIRED docs from admin settings
        requiredDocs.forEach(reqDoc => {
            const key = reqDoc.type; // e.g. '10th_marksheet'
            // Find the latest document of this type in student's uploads
            const docsOfType = backendData.documents.filter(d => d.type === key);

            // Priority: approved > rejected > submitted > uploaded > none
            const priority = ['approved', 'rejected', 'submitted', 'uploaded'];
            let found = null;
            for (const status of priority) {
                found = docsOfType.find(d => d.status === status);
                if (found) break;
            }

            if (found) {
                files[key] = {
                    id: found._id,
                    status: found.status,
                    file: found.originalName || found.fileUrl.split('/').pop(),
                    url: found.fileUrl,
                    reason: found.rejectionReason,
                    uploadedAt: found.createdAt || found.updatedAt || new Date().toISOString(),
                    label: reqDoc.name, // Display name from admin settings
                    description: reqDoc.description
                };
                if (found.status === 'approved') approvedCount++;
                if (found.status === 'submitted') submittedCount++;
            } else {
                files[key] = {
                    status: 'pending',
                    file: null,
                    label: reqDoc.name,
                    description: reqDoc.description
                };
            }
        });

        // Overall doc status logic
        // If NO required docs exist in admin settings, we can consider it 'approved' or 'pending'.
        // Let's say 'approved' if requiredDocs.length is 0 to avoid blocking, or 'pending' if we want them to wait.
        // Assuming if there are requirements, we check them.
        let overallDocStatus = 'pending';
        if (requiredDocs.length > 0) {
            if (approvedCount === requiredDocs.length) overallDocStatus = 'approved';
            else if (Object.values(files).some(f => f.status === 'rejected')) overallDocStatus = 'rejected';
            else if (Object.values(files).some(f => f.status === 'submitted')) overallDocStatus = 'submitted'; // Only if ALL are submitted? Or AT LEAST one? Usually we wait for all to submit.
            // Simplified: If all are at least submitted or approved -> submitted.
            // Actually, if we want to submit ALL at once, we check if all are 'uploaded' or higher.
            const allReady = requiredDocs.every(reqDoc => {
                const f = files[reqDoc.type];
                return ['uploaded', 'submitted', 'approved'].includes(f.status);
            });
            if (allReady && overallDocStatus !== 'approved' && overallDocStatus !== 'rejected') {
                // Check if actual backend overall status matches
                overallDocStatus = backendData.documents.status || 'uploaded';
            }
        } else {
            overallDocStatus = 'approved'; // No docs required
        }

        // Fee
        const feeData = backendData.fee || {};
        const fee = {
            status: feeData.status || 'pending',
            totalAmount: feeData.totalAmount || 50000,
            paidAmount: feeData.paidAmount || 0,
            history: (feeData.history || []).map(h => ({
                amount: h.amount,
                date: h.date,
                id: h.transactionId,
                transactionId: h.transactionId,
                orderId: h.orderId
            }))
        };

        // Hostel
        const hostel = {
            status: backendData.hostel.status || 'not_applied',
            gender: backendData.hostel.gender || null,
            roomType: backendData.hostel.roomType || null,
            rejectionReason: backendData.hostel.rejectionReason || null
        };

        // LMS
        const lms = {
            status: backendData.lmsActivated ? 'active' : 'inactive',
            registeredCourses: []
        };

        return {
            ...backendData,
            documents: { status: backendData.documents.status || 'pending', files }, // Use backend status mainly
            fee,
            hostel,
            lms
        };
    };

    const fetchStudentData = useCallback(async () => {
        try {
            // 1. Fetch Student Profile
            const { data: profile } = await api.get('/student/profile');

            // 2. Fetch Required Documents Settings
            // We fetch this here to ensure we have the latest definition to build the UI
            let reqDocs = [];
            try {
                const { data: docs } = await api.get('/student/required-documents');
                reqDocs = docs || [];
            } catch (err) {
                console.error("Failed to fetch required documents settings", err);
                // Fallback (optional) or leave empty
            }

            if (profile) {
                const formatted = formatStudentData(profile, reqDocs);
                setStudentData(formatted);
                setProgress(profile.progressPercentage || 0);
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

                // Build verification history from notifications
                const verificationHistory = (profile.notifications || [])
                    .filter(n => n.message && (n.message.includes('approved') || n.message.includes('rejected')))
                    .map(n => {
                        const isApproved = n.message.includes('approved');
                        // Extract doc type from notification message
                        const match = n.message.match(/\((.+?)\)/);
                        return {
                            file: match ? match[1] : 'Document',
                            status: isApproved ? 'approved' : 'rejected',
                            reason: isApproved ? null : n.message.split(': ')[1] || '',
                            date: n.date
                        };
                    });

                return {
                    id: profile.userId._id,
                    name: profile.userId.name,
                    email: profile.userId.email,
                    role: profile.userId.role || 'student',
                    branch: profile.userId.branch,
                    year: profile.userId.year,
                    verificationHistory,
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

    const deleteDocument = async (docId) => {
        try {
            await api.delete(`/student/document/${docId}`);
            await fetchStudentData();
            return true;
        } catch (error) {
            console.error("Delete failed:", error);
            return false;
        }
    };

    const submitDocuments = async () => {
        try {
            await api.post('/student/submit-documents');
            await fetchStudentData();
            return true;
        } catch (error) {
            console.error("Submit failed:", error);
            return false;
        }
    };

    const initiateFeePayment = async (amount) => {
        try {
            const { data: order } = await api.post('/payment/create-order', { amount });

            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                amount: order.amount,
                currency: "INR",
                name: "ARIA University",
                description: "Tuition Fee Payment",
                image: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
                order_id: order.id,
                handler: async function (response) {
                    try {
                        await api.post('/payment/verify', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        });

                        alert("🎉 Payment Successful!\n\nYour tuition fee payment has been processed successfully.\nPayment ID: " + response.razorpay_payment_id);

                        await fetchStudentData();
                    } catch (error) {
                        console.error("Payment verification failed:", error);
                        alert("❌ Payment Verification Failed\n\nYour payment was received but verification failed. Please contact support with Payment ID: " + response.razorpay_payment_id);
                    }
                },
                prefill: {
                    name: user?.name || "Student",
                    email: user?.email || "student@aria.edu",
                    contact: "9999999999"
                },
                notes: {
                    student_id: user?._id,
                    purpose: "Tuition Fee Payment"
                },
                modal: {
                    ondismiss: function () {
                        console.log("Payment cancelled by user");
                    }
                }
            };

            const rzp1 = new window.Razorpay(options);

            // Handle payment failure
            rzp1.on('payment.failed', function (response) {
                console.error("Payment failed:", response.error);
                alert("❌ Payment Failed\n\n" +
                    "Reason: " + response.error.description + "\n" +
                    "Error Code: " + response.error.code);
            });

            rzp1.open();
        } catch (error) {
            console.error("Payment init failed", error);
            alert("❌ Could not initiate payment\n\nPlease check your internet connection and try again.");
        }
    };

    const applyHostel = async (gender, roomType) => {
        try {
            await api.post('/student/apply-hostel', { gender, roomType });
            await fetchStudentData();
            return { success: true };
        } catch (error) {
            console.error(error);
            const msg = error?.response?.data?.message || 'Failed to apply';
            return { success: false, message: msg };
        }
    };

    const fetchHostelApplications = async () => {
        try {
            const { data } = await api.get('/admin/hostel-applications');
            return data;
        } catch (error) {
            console.error(error);
            return [];
        }
    };

    const fetchAllPayments = async () => {
        try {
            const { data } = await api.get('/admin/payments');
            return data;
        } catch (error) {
            console.error(error);
            return [];
        }
    };

    const approveRejectHostel = async (studentId, status, rejectionReason = '') => {
        try {
            await api.put(`/admin/hostel-applications/${studentId}`, { status, rejectionReason });
            await fetchAllStudents();
            return true;
        } catch (error) {
            console.error(error);
            return false;
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

    const fetchSubjects = async () => {
        try {
            const { data } = await api.get('/student/subjects');
            return data;
        } catch (error) {
            console.error("Failed to fetch subjects", error);
            return [];
        }
    };

    const registerSubject = async (subjectId) => {
        try {
            await api.post('/student/register-subject', { subjectId });
            await fetchStudentData();
            return true;
        } catch (error) {
            console.error("Failed to register subject", error);
            throw error;
        }
    };

    const fetchRegisteredSubjects = async () => {
        try {
            const { data } = await api.get('/student/registered-subjects');
            return data;
        } catch (error) {
            console.error("Failed to fetch registered subjects", error);
            return [];
        }
    };

    const updateModuleStatus = (moduleName, newData) => {
        console.warn("updateModuleStatus is deprecated. Use specific actions.");
    };

    // Admin settings actions
    const fetchAdminSettings = async () => {
        try {
            const { data } = await api.get('/admin/settings');
            return data;
        } catch (error) {
            console.error('Failed to fetch admin settings', error);
            return null;
        }
    };

    const updateRequiredDocuments = async (documents) => {
        try {
            const { data } = await api.put('/admin/settings/documents', { documents });
            return data;
        } catch (error) {
            console.error('Failed to update docs', error);
            throw error;
        }
    };

    const updateHostelRooms = async (rooms) => {
        try {
            const { data } = await api.put('/admin/settings/hostel-rooms', { rooms });
            return data;
        } catch (error) {
            console.error('Failed to update hostel rooms', error);
            throw error;
        }
    };

    const fetchHostelAvailability = async () => {
        try {
            const { data } = await api.get('/student/hostel-availability');
            return data;
        } catch (error) {
            console.error('Failed to fetch hostel availability', error);
            return [];
        }
    };

    const updateStudentStatus = async (studentId, moduleName, status, reason = null, fileKey = null) => {
        if (moduleName === 'documents' && fileKey) {
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
                    await fetchAllStudents();
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
            deleteDocument,
            submitDocuments,
            initiateFeePayment,
            applyHostel,
            activateLMS,
            fetchSubjects,
            registerSubject,
            fetchRegisteredSubjects,
            updateModuleStatus,
            updateStudentStatus,
            fetchHostelApplications,
            approveRejectHostel,
            fetchAllPayments,
            fetchAdminSettings,
            updateRequiredDocuments,
            updateHostelRooms,
            fetchHostelAvailability,
            deleteStudent: async (id) => {
                try {
                    await api.delete(`/admin/students/${id}`);
                    await fetchAllStudents();
                    return true;
                } catch (error) {
                    console.error("Failed to delete student", error);
                    return false;
                }
            }
        }}>
            {children}
        </DataContext.Provider>
    );
};
