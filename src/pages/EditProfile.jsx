import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';

function EditProfile() {
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [serverError, setServerError] = useState('');
    const [statusMessage, setStatusMessage] = useState('');
    const [docId, setDocId] = useState('');

    const [imageFile, setImageFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        gender: '',
        birthYear: '',
        birthMonth: '',
        birthDay: '',
        department: '',
        collegeDept: '',
        shsCourse: '',
        jhsGradeLevel: '',
        block: '',
        yearLevel: '',
        role: '',
        photoURL: ''
    });

    // =========================================================
    // FETCH USER DATA
    // =========================================================
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const currentUser = auth.currentUser;
                const localStudentId = localStorage.getItem('studentId');

                const id = currentUser
                    ? currentUser.uid
                    : localStudentId;

                if (!id) {
                    navigate('/login');
                    return;
                }

                setDocId(id);

                const userDoc = await getDoc(
                    doc(db, 'users', id)
                );

                if (userDoc.exists()) {
                    const data = userDoc.data();

                    let bYear = '';
                    let bMonth = '';
                    let bDay = '';

                    if (data.birthdate) {
                        const parts = data.birthdate.split('-');

                        if (parts.length === 3) {
                            bYear = parts[0];
                            bMonth = parseInt(parts[1], 10).toString();
                            bDay = parseInt(parts[2], 10).toString();
                        }
                    }

                    setFormData({
                        firstName: data.firstName || '',
                        lastName: data.lastName || '',
                        email: data.email || '',
                        phone: data.phone || '',
                        gender: data.gender || '',

                        birthYear: bYear,
                        birthMonth: bMonth,
                        birthDay: bDay,

                        department: data.department || '',
                        collegeDept: data.collegeDept || '',
                        shsCourse: data.shsCourse || '',
                        jhsGradeLevel: data.jhsGradeLevel || '',
                        block: data.block || '',
                        yearLevel: data.yearLevel || '',

                        role: data.role || 'student',
                        photoURL: data.photoURL || ''
                    });

                    // Existing Cloudinary profile picture
                    if (data.photoURL) {
                        setPreviewUrl(data.photoURL);
                    }
                } else {
                    setServerError('User details not found.');
                }

            } catch (err) {
                console.error(err);

                setServerError(
                    'Error retrieving profile data: ' + err.message
                );

            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [navigate]);


    // =========================================================
    // IMAGE COMPRESSION
    // =========================================================
    const compressImage = (
        file,
        maxWidth = 500,
        maxHeight = 500,
        quality = 0.7
    ) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.readAsDataURL(file);

            reader.onload = (event) => {
                const img = new Image();

                img.src = event.target.result;

                img.onload = () => {
                    const canvas = document.createElement('canvas');

                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxWidth) {
                            height = Math.round(
                                (height * maxWidth) / width
                            );

                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width = Math.round(
                                (width * maxHeight) / height
                            );

                            height = maxHeight;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');

                    ctx.drawImage(
                        img,
                        0,
                        0,
                        width,
                        height
                    );

                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                resolve(blob);
                            } else {
                                reject(
                                    new Error(
                                        'Image compression failed.'
                                    )
                                );
                            }
                        },
                        'image/jpeg',
                        quality
                    );
                };

                img.onerror = () => {
                    reject(
                        new Error(
                            'Unable to process the selected image.'
                        )
                    );
                };
            };

            reader.onerror = () => {
                reject(
                    new Error(
                        'Unable to read the selected image.'
                    )
                );
            };
        });
    };


    // =========================================================
    // CLOUDINARY UPLOAD
    // =========================================================
    const uploadImageToCloudinary = async (file) => {
        const cloudName = 'dvfykqznw';
        const uploadPreset = 'Oyfound';
        const body = new FormData();
        body.append('file', file);
        body.append('upload_preset', uploadPreset);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        try {
            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
                {
                    method: 'POST',
                    body,
                    signal: controller.signal
                }
            );

            const result = await response.json();

            if (!response.ok) {
                console.error('Cloudinary Error:', result);
                throw new Error(
                    result?.error?.message || 'Cloudinary upload failed.'
                );
            }

            if (!result?.secure_url) {
                throw new Error('Cloudinary did not return an image URL.');
            }

            return result.secure_url;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Cloudinary upload timed out. Please check your internet connection and try again.');
            }
            throw new Error(error.message || 'Connection to Cloudinary failed.');
        } finally {
            clearTimeout(timeoutId);
        }
    };


    // =========================================================
    // FORM INPUT
    // =========================================================
    const handleChange = (e) => {
        const {
            name,
            value
        } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));
    };


    // =========================================================
    // IMAGE SELECT
    // =========================================================
    const handleImageChange = async (e) => {
        const file = e.target.files?.[0];

        if (!file) {
            return;
        }

        // Make sure the selected file is an image
        if (!file.type.startsWith('image/')) {
            setServerError(
                'Please select a valid image file.'
            );

            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            setServerError('Please choose an image smaller than 10 MB.');
            return;
        }

        try {
            setServerError('');
            setStatusMessage('Processing profile picture...');

            const compressedBlob = await compressImage(file);

            setImageFile(compressedBlob);

            setPreviewUrl((previousUrl) => {
                if (previousUrl?.startsWith('blob:')) {
                    URL.revokeObjectURL(previousUrl);
                }
                return URL.createObjectURL(compressedBlob);
            });

            setStatusMessage('Profile picture is ready to upload.');
        } catch (error) {
            console.error(error);

            setStatusMessage('');
            setServerError(
                error.message || 'Unable to process the selected image.'
            );
        }
    };


    // =========================================================
    // SAVE PROFILE
    // =========================================================
    const handleSave = async (e) => {
        e.preventDefault();

        setServerError('');
        setStatusMessage('Saving profile...');
        setSaving(true);

        try {
            // Keep existing photo URL if no new image
            let uploadedPhotoURL =
                formData.photoURL;

            // =================================================
            // UPLOAD NEW IMAGE TO CLOUDINARY
            // =================================================
            if (imageFile) {
                setStatusMessage('Uploading profile picture...');
                uploadedPhotoURL = await uploadImageToCloudinary(imageFile);
            }

            setStatusMessage('Saving profile information...');

            // =================================================
            // FORMAT BIRTHDATE
            // =================================================
            const formattedMonth =
                String(formData.birthMonth)
                    .padStart(2, '0');

            const formattedDay =
                String(formData.birthDay)
                    .padStart(2, '0');

            const birthdate =
                `${formData.birthYear}-${formattedMonth}-${formattedDay}`;


            // =================================================
            // DATA TO UPDATE
            // =================================================
            const updatedData = {
                firstName: formData.firstName,
                lastName: formData.lastName,

                fullName:
                    `${formData.firstName} ${formData.lastName}`,

                gender: formData.gender,

                birthdate: birthdate,

                // Cloudinary URL
                photoURL: uploadedPhotoURL
            };


            // =================================================
            // CONTACT INFORMATION
            // =================================================
            if (formData.department !== 'Elementary') {

                updatedData.email =
                    formData.email;

                updatedData.phone =
                    formData.phone;
            }


            // =================================================
            // STUDENT INFORMATION
            // =================================================
            if (formData.role === 'student') {

                updatedData.department =
                    formData.department;


                if (
                    formData.department ===
                    'College'
                ) {

                    updatedData.collegeDept =
                        formData.collegeDept;

                    updatedData.yearLevel =
                        formData.yearLevel;

                    updatedData.block =
                        formData.block;

                }

                else if (
                    formData.department ===
                    'Senior High'
                ) {

                    updatedData.shsCourse =
                        formData.shsCourse;

                }

                else if (
                    formData.department ===
                    'Junior High'
                ) {

                    updatedData.jhsGradeLevel =
                        formData.jhsGradeLevel;
                }
            }


            // =================================================
            // UPDATE FIRESTORE
            // =================================================
            const firestoreSave = updateDoc(
                doc(db, 'users', docId),
                updatedData
            );

            await Promise.race([
                firestoreSave,
                new Promise((_, reject) =>
                    setTimeout(
                        () => reject(new Error('Saving profile timed out. Please check your internet connection and try again.')),
                        20000
                    )
                )
            ]);


            // =================================================
            // SUCCESS
            // =================================================
            if (previewUrl?.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl);
            }
            setStatusMessage('Profile updated successfully.');
            navigate('/profile');

        } catch (err) {

            console.error(
                'Profile Update Error:',
                err
            );

            setStatusMessage('');
            setServerError(
                'Failed to update profile: ' +
                err.message
            );

        } finally {

            setSaving(false);
        }
    };


    // =========================================================
    // LOADING SCREEN
    // =========================================================
    if (loading) {
        return (
            <div
                className="profile-dashboard-layout d-flex align-items-center justify-content-center"
            >
                <p style={{ color: '#E0E1DD' }}>
                    Loading Profile Editor...
                </p>
            </div>
        );
    }


    // =========================================================
    // INPUT STYLE
    // =========================================================
    const inputStyle = {
        width: '100%',
        padding: '10px 14px',
        borderRadius: '8px',
        border:
            '1px solid rgba(255, 255, 255, 0.2)',
        background:
            'rgba(15, 23, 42, 0.6)',
        color: '#E0E1DD',
        fontSize: '0.9rem',
        outline: 'none',
        marginTop: '6px'
    };


    const initial =
        formData.firstName
            ? formData.firstName
                .charAt(0)
                .toUpperCase()
            : 'U';


    // =========================================================
    // UI
    // =========================================================
    return (
        <div className="profile-dashboard-layout">

            <div className="profile-grid-container">

                {/* =================================================
                    SIDEBAR PREVIEW
                ================================================= */}
                <aside className="hero-identity-sidebar">

                    <div className="sidebar-backdrop-glow"></div>

                    <div className="identity-card-core">

                        <div className="avatar-frame-premium">

                            {previewUrl ? (

                                <img
                                    src={previewUrl}
                                    alt="Avatar Preview"
                                    className="dashboard-avatar-img"
                                />

                            ) : (

                                <div className="profile-icon-fallback">
                                    {initial}
                                </div>

                            )}

                            <div
                                className="pulse-indicator-online"
                                title="Editing"
                            ></div>

                        </div>


                        <div className="identity-text-stack">

                            <h2 className="user-display-name">
                                {formData.firstName}{' '}
                                {formData.lastName}
                            </h2>

                            <span className="user-role-pill">
                                {formData.role}
                            </span>

                        </div>

                    </div>

                </aside>


                {/* =================================================
                    EDIT FORM
                ================================================= */}
                <main className="workspace-main-content">

                    <h1 className="workspace-main-title">
                        Edit Workspace Profile
                    </h1>


                    {/* STATUS */}
                    {statusMessage && !serverError && (
                        <div
                            className="dashboard-data-card mb-2"
                            style={{ borderColor: '#52b788' }}
                        >
                            <p style={{ color: '#52b788', margin: 0 }}>
                                {statusMessage}
                            </p>
                        </div>
                    )}

                    {/* ERROR */}
                    {serverError && (

                        <div
                            className="dashboard-data-card mb-2"
                            style={{
                                borderColor: '#ef4444'
                            }}
                        >

                            <p
                                style={{
                                    color: '#f87171',
                                    margin: 0
                                }}
                            >
                                {serverError}
                            </p>

                        </div>

                    )}


                    <form onSubmit={handleSave}>

                        <div className="dashboard-cards-grid">


                            {/* =================================================
                                PROFILE PICTURE
                            ================================================= */}
                            <div
                                className="dashboard-data-card"
                                style={{
                                    gridColumn: '1 / -1'
                                }}
                            >

                                <div className="card-indicator-line variant-accent"></div>

                                <h3 className="data-card-title">
                                    Profile Picture
                                </h3>


                                <div className="meta-data-block">

                                    <label>
                                        Upload New Picture
                                        (Auto-Compressed)
                                    </label>

                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={
                                            handleImageChange
                                        }
                                        disabled={saving}
                                        style={inputStyle}
                                    />

                                </div>


                                {statusMessage && (
                                    <p
                                        style={{
                                            color: '#52b788',
                                            marginTop: '10px',
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        {statusMessage}
                                    </p>
                                )}

                            </div>


                            {/* =================================================
                                GENERAL INFORMATION
                            ================================================= */}
                            <div
                                className="dashboard-data-card"
                                style={{
                                    gridColumn: '1 / -1'
                                }}
                            >

                                <div className="card-indicator-line"></div>

                                <h3 className="data-card-title">
                                    General Information
                                </h3>


                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns:
                                            'repeat(auto-fit, minmax(240px, 1fr))',
                                        gap: '16px'
                                    }}
                                >

                                    {/* FIRST NAME */}
                                    <div className="meta-data-block">

                                        <label>
                                            First Name
                                        </label>

                                        <input
                                            type="text"
                                            name="firstName"
                                            style={inputStyle}
                                            value={
                                                formData.firstName
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            required
                                        />

                                    </div>


                                    {/* LAST NAME */}
                                    <div className="meta-data-block">

                                        <label>
                                            Last Name
                                        </label>

                                        <input
                                            type="text"
                                            name="lastName"
                                            style={inputStyle}
                                            value={
                                                formData.lastName
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            required
                                        />

                                    </div>


                                    {/* GENDER */}
                                    <div className="meta-data-block">

                                        <label>
                                            Gender
                                        </label>

                                        <select
                                            name="gender"
                                            style={inputStyle}
                                            value={
                                                formData.gender
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            required
                                        >

                                            <option value="">
                                                Select Gender
                                            </option>

                                            <option value="male">
                                                Male
                                            </option>

                                            <option value="female">
                                                Female
                                            </option>

                                            <option value="other">
                                                Other
                                            </option>

                                        </select>

                                    </div>

                                </div>


                                {/* =================================================
                                    BIRTHDATE
                                ================================================= */}
                                <div
                                    style={{
                                        marginTop: '16px'
                                    }}
                                >

                                    <label
                                        style={{
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            color:
                                                'rgba(224, 225, 221, 0.6)',
                                            textTransform:
                                                'uppercase'
                                        }}
                                    >
                                        Date of Birth
                                    </label>


                                    <div
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns:
                                                '1fr 1fr 1fr',
                                            gap: '12px',
                                            marginTop: '6px'
                                        }}
                                    >

                                        {/* MONTH */}
                                        <select
                                            name="birthMonth"
                                            style={inputStyle}
                                            value={
                                                formData.birthMonth
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            required
                                        >

                                            <option value="">
                                                Month
                                            </option>

                                            {Array.from(
                                                { length: 12 },
                                                (_, i) => (

                                                    <option
                                                        key={i + 1}
                                                        value={i + 1}
                                                    >
                                                        {new Date(
                                                            0,
                                                            i
                                                        ).toLocaleString(
                                                            'default',
                                                            {
                                                                month:
                                                                    'short'
                                                            }
                                                        )}
                                                    </option>

                                                )
                                            )}

                                        </select>


                                        {/* DAY */}
                                        <select
                                            name="birthDay"
                                            style={inputStyle}
                                            value={
                                                formData.birthDay
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            required
                                        >

                                            <option value="">
                                                Day
                                            </option>

                                            {Array.from(
                                                { length: 31 },
                                                (_, i) => (

                                                    <option
                                                        key={i + 1}
                                                        value={i + 1}
                                                    >
                                                        {i + 1}
                                                    </option>

                                                )
                                            )}

                                        </select>


                                        {/* YEAR */}
                                        <select
                                            name="birthYear"
                                            style={inputStyle}
                                            value={
                                                formData.birthYear
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            required
                                        >

                                            <option value="">
                                                Year
                                            </option>

                                            {Array.from(
                                                { length: 100 },
                                                (_, i) =>
                                                    new Date()
                                                        .getFullYear() -
                                                    i
                                            ).map(
                                                (year) => (

                                                    <option
                                                        key={year}
                                                        value={year}
                                                    >
                                                        {year}
                                                    </option>

                                                )
                                            )}

                                        </select>

                                    </div>

                                </div>

                            </div>


                            {/* =================================================
                                CONTACT INFORMATION
                            ================================================= */}
                            {formData.department !==
                                'Elementary' && (

                                <div
                                    className="dashboard-data-card"
                                    style={{
                                        gridColumn:
                                            '1 / -1'
                                    }}
                                >

                                    <div className="card-indicator-line variant-accent"></div>

                                    <h3 className="data-card-title">
                                        Contact Info
                                    </h3>


                                    <div
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns:
                                                'repeat(auto-fit, minmax(240px, 1fr))',
                                            gap: '16px'
                                        }}
                                    >

                                        {/* EMAIL */}
                                        <div className="meta-data-block">

                                            <label>
                                                Email Address
                                            </label>

                                            <input
                                                type="email"
                                                name="email"
                                                style={
                                                    inputStyle
                                                }
                                                value={
                                                    formData.email
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                required
                                            />

                                        </div>


                                        {/* PHONE */}
                                        <div className="meta-data-block">

                                            <label>
                                                Phone Number
                                            </label>

                                            <input
                                                type="tel"
                                                name="phone"
                                                style={
                                                    inputStyle
                                                }
                                                value={
                                                    formData.phone
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                required
                                            />

                                        </div>

                                    </div>

                                </div>

                            )}


                            {/* =================================================
                                ACADEMIC DETAILS
                            ================================================= */}
                            {formData.role ===
                                'student' && (

                                <div
                                    className="dashboard-data-card"
                                    style={{
                                        gridColumn:
                                            '1 / -1'
                                    }}
                                >

                                    <div className="card-indicator-line"></div>

                                    <h3 className="data-card-title">
                                        Academic Details
                                    </h3>


                                    <div
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns:
                                                'repeat(auto-fit, minmax(220px, 1fr))',
                                            gap: '16px'
                                        }}
                                    >

                                        {/* DEPARTMENT */}
                                        <div className="meta-data-block">

                                            <label>
                                                Department
                                            </label>

                                            <select
                                                name="department"
                                                style={
                                                    inputStyle
                                                }
                                                value={
                                                    formData.department
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                required
                                            >

                                                <option value="">
                                                    Select Department
                                                </option>

                                                <option value="College">
                                                    College
                                                </option>

                                                <option value="Senior High">
                                                    Senior High
                                                </option>

                                                <option value="Junior High">
                                                    Junior High
                                                </option>

                                                <option value="Elementary">
                                                    Elementary
                                                </option>

                                            </select>

                                        </div>


                                        {/* COLLEGE */}
                                        {formData.department ===
                                            'College' && (
                                            <>

                                                <div className="meta-data-block">

                                                    <label>
                                                        Program
                                                    </label>

                                                    <select
                                                        name="collegeDept"
                                                        style={
                                                            inputStyle
                                                        }
                                                        value={
                                                            formData.collegeDept
                                                        }
                                                        onChange={
                                                            handleChange
                                                        }
                                                        required
                                                    >

                                                        <option value="">
                                                            Select Course
                                                        </option>

                                                        <option value="BEED">
                                                            BEED
                                                        </option>

                                                        <option value="BSED">
                                                            BSED
                                                        </option>

                                                        <option value="BPED">
                                                            BPED
                                                        </option>

                                                        <option value="BSEntrep">
                                                            BSEntrep
                                                        </option>

                                                        <option value="BSHM">
                                                            BSHM
                                                        </option>

                                                        <option value="BSIT">
                                                            BSIT
                                                        </option>

                                                    </select>

                                                </div>


                                                <div className="meta-data-block">

                                                    <label>
                                                        Year Level
                                                    </label>

                                                    <select
                                                        name="yearLevel"
                                                        style={
                                                            inputStyle
                                                        }
                                                        value={
                                                            formData.yearLevel
                                                        }
                                                        onChange={
                                                            handleChange
                                                        }
                                                        required
                                                    >

                                                        <option value="">
                                                            Select Year
                                                        </option>

                                                        <option value="1">
                                                            1st Year
                                                        </option>

                                                        <option value="2">
                                                            2nd Year
                                                        </option>

                                                        <option value="3">
                                                            3rd Year
                                                        </option>

                                                        <option value="4">
                                                            4th Year
                                                        </option>

                                                    </select>

                                                </div>


                                                <div className="meta-data-block">

                                                    <label>
                                                        Block
                                                    </label>

                                                    <select
                                                        name="block"
                                                        style={
                                                            inputStyle
                                                        }
                                                        value={
                                                            formData.block
                                                        }
                                                        onChange={
                                                            handleChange
                                                        }
                                                        required
                                                    >

                                                        <option value="">
                                                            Select Block
                                                        </option>

                                                        {[
                                                            'A',
                                                            'B',
                                                            'C',
                                                            'D',
                                                            'E'
                                                        ].map(
                                                            (b) => (

                                                                <option
                                                                    key={b}
                                                                    value={b}
                                                                >
                                                                    Block{' '}
                                                                    {b}
                                                                </option>

                                                            )
                                                        )}

                                                    </select>

                                                </div>

                                            </>
                                        )}


                                        {/* SENIOR HIGH */}
                                        {formData.department ===
                                            'Senior High' && (

                                            <div className="meta-data-block">

                                                <label>
                                                    Strand / Track
                                                </label>

                                                <select
                                                    name="shsCourse"
                                                    style={
                                                        inputStyle
                                                    }
                                                    value={
                                                        formData.shsCourse
                                                    }
                                                    onChange={
                                                        handleChange
                                                    }
                                                    required
                                                >

                                                    <option value="">
                                                        Select Strand
                                                    </option>

                                                    <option value="ABM">
                                                        ABM
                                                    </option>

                                                    <option value="HUMSS">
                                                        HUMSS
                                                    </option>

                                                    <option value="STEM">
                                                        STEM
                                                    </option>

                                                    <option value="TVL: ICT">
                                                        TVL: ICT
                                                    </option>

                                                    <option value="TVL: HE">
                                                        TVL: HE
                                                    </option>

                                                </select>

                                            </div>

                                        )}


                                        {/* JUNIOR HIGH */}
                                        {formData.department ===
                                            'Junior High' && (

                                            <div className="meta-data-block">

                                                <label>
                                                    Grade Level
                                                </label>

                                                <select
                                                    name="jhsGradeLevel"
                                                    style={
                                                        inputStyle
                                                    }
                                                    value={
                                                        formData.jhsGradeLevel
                                                    }
                                                    onChange={
                                                        handleChange
                                                    }
                                                    required
                                                >

                                                    <option value="">
                                                        Select Grade
                                                    </option>

                                                    <option value="7">
                                                        Grade 7
                                                    </option>

                                                    <option value="8">
                                                        Grade 8
                                                    </option>

                                                    <option value="9">
                                                        Grade 9
                                                    </option>

                                                    <option value="10">
                                                        Grade 10
                                                    </option>

                                                </select>

                                            </div>

                                        )}

                                    </div>

                                </div>

                            )}

                        </div>


                        {/* =================================================
                            BUTTONS
                        ================================================= */}
                        <div
                            style={{
                                marginTop: '24px',
                                display: 'flex',
                                gap: '12px'
                            }}
                        >

                            <button
                                type="submit"
                                className="btn-action-primary"
                                disabled={saving}
                            >
                                {saving
                                    ? (imageFile ? 'Uploading & Saving...' : 'Saving...')
                                    : 'Save Changes'}
                            </button>


                            <button
                                type="button"
                                className="btn-action-danger"
                                onClick={() =>
                                    navigate('/profile')
                                }
                                disabled={saving}
                            >
                                Cancel
                            </button>

                        </div>

                    </form>

                </main>

            </div>

        </div>
    );
}

export default EditProfile;