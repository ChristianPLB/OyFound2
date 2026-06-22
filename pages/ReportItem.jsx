import { addDoc, collection } from "firebase/firestore";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useRef, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Bounding box for Toledo City region
const TOLEDO_BOUNDS = [[10.2500, 123.5000], [10.5000, 123.8000]];

const TOLEDO_BARANGAYS = [
    "Awihao", "Bato", "Biga", "Bulamoc", "Cabitoonan", "Calubihan",
    "Cambang-ug", "Camp 8", "Canlumampao", "Cantabaco", "Capitan Claudio",
    "Carmen", "DaangLungsod", "Don Andres Soriano (Lutopan)", "Dumlog",
    "Ibo", "Ilihan", "Landahan", "Loay", "Luray II", "Matab-ang",
    "Media Once", "Pangamihan", "Poblacion", "Poog", "Sangi", "Santa Cruz",
    "Santo Niño", "Subayon", "Talavera", "Tuburan", "Tungkay"
];

function ReportItem() {
    const navigate = useNavigate();
    const [itemStatus, setItemStatus] = useState('Lost');
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [location, setLocation] = useState(null); 
    const [locationName, setLocationName] = useState(''); 
    const [isFetchingLocation, setIsFetchingLocation] = useState(false);

    const [formData, setFormData] = useState({
        itemName: '',
        barangay: '',
        landmark: '',
        date: '',
        description: ''
    });

    const fileInputRef = useRef(null);

    const uploadImageToCloudinary = async (file) => {
        const apiKey = "396127833722297"; 
        const cloudName = "dvfykqznw";
        const uploadPreset = "Oyfound"; 

        const body = new FormData();
        body.append("file", file);
        body.append("upload_preset", uploadPreset);
        body.append("api_key", apiKey);

        try {
            const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                method: "POST",
                body: body,
            });

            const result = await response.json();

            if (response.ok) {
                return result.secure_url; 
            } else {
                console.error("Cloudinary Error:", result.error);
                throw new Error(result.error.message || "Cloudinary Upload Failed");
            }
        } catch (error) {
            throw new Error(error.message || "Connection to Cloudinary failed.");
        }
    };

    // Converts GPS coordinates to a readable place name (Used ONLY when itemStatus === 'Found')
    const fetchLocationName = async (lat, lng) => {
        setIsFetchingLocation(true);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
            );
            const data = await response.json();

            const name = data.display_name || data.name || `Toledo City Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
            
            setLocationName(name);
            setFormData(prev => ({ ...prev, landmark: name }));
        } catch (error) {
            console.error("Failed to reverse geocode:", error);
            const fallbackName = `Toledo City (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
            setLocationName(fallbackName);
            setFormData(prev => ({ ...prev, landmark: fallbackName }));
        } finally {
            setIsFetchingLocation(false);
        }
    };

    function LocationMarker() {
        useMapEvents({
            async click(e) {
                if (itemStatus === 'Found') {
                    const { lat, lng } = e.latlng;
                    setLocation(e.latlng);
                    await fetchLocationName(lat, lng);
                }
            },
        });
        return location === null ? null : <Marker position={location}></Marker>;
    }

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleFileChange = (e) => {
        if (e.target.files[0]) setSelectedFile(e.target.files[0]);
    };

    const handleStatusChange = (status) => {
        setItemStatus(status);
        // Reset map location state when toggling
        if (status === 'Lost') {
            setLocation(null);
            setLocationName('');
            setFormData(prev => ({ ...prev, landmark: '' }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (itemStatus === 'Found' && !location) {
            alert("Please click and pin the found location on the Toledo map!");
            return;
        }

        setIsUploading(true); 
        
        try {
            let imageUrl = "";

            if (selectedFile) {
                imageUrl = await uploadImageToCloudinary(selectedFile);
            }

            const currentUser = auth.currentUser;

            await addDoc(collection(db, "reports"), {
                ...formData,
                status: itemStatus,
                imageUrl: imageUrl,
                location: itemStatus === 'Found' && location ? { 
                    lat: location.lat, 
                    lng: location.lng,
                    name: locationName 
                } : null,
                reportedBy: currentUser ? currentUser.uid : "Guest",
                userEmail: currentUser ? currentUser.email : "Guest User",
                timestamp: new Date()
            });

            alert("Report published successfully!");
            navigate('/admin');

        } catch (error) {
            console.error("Submission Error:", error);
            alert(`Error: ${error.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="report-page-container"> 
            <div className="report-item-box">
                <h2 className="form-title">Submit a Report</h2>
                <p className="form-subtitle" style={{ marginBottom: '15px', color: '#778DA9', textAlign: 'center' }}>
                    Report a lost or found item across Toledo City
                </p>
                
                <div className="report-item-wrapper">
                    <form className={`report-item-form ${isUploading ? 'form-faded' : ''}`} onSubmit={handleSubmit}>
                        
                        {isUploading && (
                            <div className="loading-overlay">
                                <div className="spinner"></div>
                                <p>Publishing report to OyFound...</p>
                            </div>
                        )}

                        <div className="form-section-text">
                            {/* Item Name */}
                            <div className="input-block">
                                <label htmlFor="itemName">Item Name *</label>
                                <input 
                                    type="text" 
                                    id="itemName" 
                                    value={formData.itemName} 
                                    onChange={handleInputChange} 
                                    placeholder="e.g. Black Leather Wallet, Keys, School ID"
                                    required 
                                    disabled={isUploading}
                                />
                            </div>

                            {/* Landmark / Selected Location Name (FOUND ONLY) */}
                            {itemStatus === 'Found' && (
                                <div className="input-block">
                                    <label htmlFor="landmark">
                                        Landmark / Marked Spot Name *
                                        {isFetchingLocation && <span style={{ color: '#415A77', marginLeft: '10px', fontSize: '0.85rem' }}>(Finding location name...)</span>}
                                    </label>
                                    <input 
                                        type="text" 
                                        id="landmark" 
                                        value={formData.landmark} 
                                        onChange={handleInputChange} 
                                        placeholder="Click on the map below to auto-fill..."
                                        required={itemStatus === 'Found'} 
                                        disabled={isUploading || isFetchingLocation}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Map Locator Section (FOUND ONLY) */}
                        {itemStatus === 'Found' && (
                            <div className="input-block">
                                <label>Click Map to Mark Found Location *</label>
                                {locationName && (
                                    <p style={{ fontSize: '0.85rem', color: '#1E293B', marginBottom: '8px', fontWeight: '500' }}>
                                        📍 Marked Location: <strong>{locationName}</strong>
                                    </p>
                                )}
                                <div className="map-locator-container" style={{ height: '350px', marginBottom: '20px', position: 'relative'}}>
                                    <MapContainer center={[10.3776, 123.6358]} zoom={13} maxBounds={TOLEDO_BOUNDS} style={{ height: '100%', width: '100%' }}>
                                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                        <LocationMarker />
                                    </MapContainer>
                                </div>
                            </div>
                        )}

                        {/* Inline Date & Status Controls */}
                        <div className="form-section-meta inline-controls">
                            <div className="input-block-small" style={{ flex: 1 }}>
                                <label htmlFor="date">Date Incident Occurred *</label>
                                <input type="date" id="date" value={formData.date} onChange={handleInputChange} required disabled={isUploading}/>
                            </div>
                            <div className="status-selector">
                                <label style={{ display: 'block', marginBottom: '5px' }}>Report Type</label>
                                <div style={{ display: 'flex' }}>
                                    <button 
                                        type="button" 
                                        className={`toggle-btn lost-btn ${itemStatus === 'Lost' ? 'selected' : ''}`} 
                                        onClick={() => handleStatusChange('Lost')} 
                                        disabled={isUploading}
                                    >
                                        Lost Item
                                    </button>
                                    <button 
                                        type="button" 
                                        className={`toggle-btn found-btn ${itemStatus === 'Found' ? 'selected' : ''}`} 
                                        onClick={() => handleStatusChange('Found')} 
                                        disabled={isUploading}
                                    >
                                        Found Item
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Description & Image Upload */}
                        <div className="form-section-main flex-grid">
                            <div className="input-block description-box">
                                <label htmlFor="description">Detailed Description</label>
                                <textarea id="description" rows="4" value={formData.description} onChange={handleInputChange} placeholder="Describe distinct features, color, brand, or contents..." disabled={isUploading}></textarea>
                            </div>
                            <div className="input-block">
                                <label>Attach Image</label>
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" disabled={isUploading}/>
                            </div>
                        </div>

                        <button type="submit" className="final-report-btn" disabled={isUploading || isFetchingLocation}>
                            {isUploading ? "Uploading..." : "Publish Report"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default ReportItem;