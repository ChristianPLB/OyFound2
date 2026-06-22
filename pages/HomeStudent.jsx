import { addDoc, collection, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect, useState } from 'react';
import { auth, db } from '../firebase';

// Helper function to automatically identify and categorize items based on their names
const autoIdentifyCategory = (itemName, dbCategory) => {
    if (dbCategory && dbCategory.trim() !== "") {
        return dbCategory;
    }

    if (!itemName) return "Uncategorized";

    const name = itemName.toLowerCase().trim();

    if (name.includes("key") || name.includes("fob") || name.includes("lanyard")) {
        return "Keys & Accessories";
    }
    if (name.includes("pickleball") || name.includes("racket") || name.includes("ball") || name.includes("bat") || name.includes("glove")) {
        return "Sports Equipment";
    }
    if (name.includes("wallet") || name.includes("purse") || name.includes("pouch") || name.includes("card holder") || name.includes("cash")) {
        return "Personal Valuables";
    }
    if (name.includes("headphone") || name.includes("earphone") || name.includes("airpods") || name.includes("charger") || name.includes("phone") || name.includes("laptop")) {
        return "Electronics";
    }
    if (name.includes("tumbler") || name.includes("bottle") || name.includes("flask") || name.includes("mug") || name.includes("cup")) {
        return "Containers & Bottles";
    }
    if (name.includes("id") || name.includes("license") || name.includes("card") || name.includes("document") || name.includes("paper")) {
        return "Documents & IDs";
    }
    if (name.includes("bag") || name.includes("backpack") || name.includes("tote") || name.includes("handbag")) {
        return "Bags & Luggage";
    }
    if (name.includes("jacket") || name.includes("hoodie") || name.includes("shirt") || name.includes("cap") || name.includes("umbrella")) {
        return "Apparel & Accessories";
    }

    return "General Items";
};

function HomeStudent({ searchQuery }) {
    const [activeTab, setActiveTab] = useState('All');
    const [reports, setReports] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null); 
    const [isSendingClaim, setIsSendingClaim] = useState(false);
    const [animatingItemId, setAnimatingItemId] = useState(null);

    useEffect(() => {
        const qActive = query(collection(db, "reports"), orderBy("timestamp", "desc"));
        const unsub = onSnapshot(qActive, (snap) => {
            setReports(snap.docs.map(doc => ({ ...doc.data(), id: doc.id })));
        });
        return () => unsub();
    }, []);

    const handleItemClick = (item, category) => {
        setAnimatingItemId(item.id);
        setSelectedItem({ ...item, category });

        setTimeout(() => {
            setAnimatingItemId(null);
        }, 600);
    };

    const handleClaimItem = async (e, item) => {
        e.stopPropagation(); 
        
        const currentUser = auth.currentUser;
        if (!currentUser) {
            alert("You must be logged in to claim an item.");
            return;
        }

        if (isSendingClaim) return;
        setIsSendingClaim(true);
        
        try {
            let activeFirstName = "";
            let activeLastName = "";
            const activeEmail = currentUser.email || "";

            const userDocRef = doc(db, "users", currentUser.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                activeFirstName = userData.firstName || userData.firstname || "";
                activeLastName = userData.lastName || userData.lastname || "";
            }

            if (!activeFirstName && !activeLastName && currentUser.displayName) {
                const nameParts = currentUser.displayName.split(" ");
                activeFirstName = nameParts[0] || "";
                activeLastName = nameParts.slice(1).join(" ") || "";
            }

            const finalStudentName = `${activeFirstName} ${activeLastName}`.trim() || activeEmail.split('@')[0] || "Student User";

            const claimMeta = {
                type: "claim_request",
                itemId: item.id,
                itemName: item.itemName,
                itemCategory: item.category || "",
                firstName: activeFirstName,
                lastName: activeLastName,
                fullName: finalStudentName,
                email: activeEmail,
                avatarUrl: currentUser.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
                message: `📢 CLAIM REQUEST: "${item.itemName}"`,
                timestamp: serverTimestamp(),
                unread: true
            };

            const conversationDocRef = doc(db, "messages", currentUser.uid);
            await setDoc(conversationDocRef, claimMeta, { merge: true });

            await addDoc(collection(db, "messages", currentUser.uid, "replies"), {
                text: `Hello Admin, I am claiming the item "${item.itemName}" found at "${item.landmark || 'Not specified'}". Please see my attached item confirmation snapshot.`,
                imageUrl: item.imageUrl || null, 
                sender: "student",
                senderId: currentUser.uid, 
                senderName: finalStudentName,
                role: 'student',
                timestamp: serverTimestamp()
            });
            
            alert(`Claim request for "${item.itemName}" has been sent successfully!`);
            setSelectedItem(null); 
        } catch (error) {
            console.error("Error sending claim request:", error);
            alert("Failed to pass claim sequence.");
        } finally {
            setIsSendingClaim(false);
        }
    };

    const filteredItems = reports.filter(item => {
        const matchesTab = activeTab === 'All' ? true : item.status === activeTab;
        
        const queryClean = (searchQuery || "").toLowerCase().trim();
        const nameToSearch = (item.itemName || "").toLowerCase();
        const descToSearch = (item.description || "").toLowerCase();
        const landmarkToSearch = (item.landmark || "").toLowerCase();
        const categoryToSearch = autoIdentifyCategory(item.itemName, item.category).toLowerCase();

        const matchesSearch = queryClean === "" || 
            nameToSearch.includes(queryClean) || 
            descToSearch.includes(queryClean) || 
            landmarkToSearch.includes(queryClean) ||
            categoryToSearch.includes(queryClean);

        return matchesTab && matchesSearch;
    });

    return (
        <div className="student-home">
            <div className="category-header">
                <button className={activeTab === 'Lost' ? 'active' : ''} onClick={() => setActiveTab('Lost')}>Lost</button>
                <button className={activeTab === 'Found' ? 'active' : ''} onClick={() => setActiveTab('Found')}>Found</button>
                <button className={activeTab === 'All' ? 'active' : ''} onClick={() => setActiveTab('All')}>All</button>
            </div>

            <div className="reports-grid-container">
                {filteredItems.length === 0 ? (
                    <div className="empty-state-card">
                        <p>No item reports found here.</p>
                    </div>
                ) : (
                    filteredItems.map(item => {
                        const identifiedCategory = autoIdentifyCategory(item.itemName, item.category);

                        return (
                            <div 
                                key={item.id} 
                                className={`report-card ${animatingItemId === item.id ? 'bounce-in' : ''}`}
                                onClick={() => handleItemClick(item, identifiedCategory)}
                            >
                                <div className="card-image-wrapper">
                                    <img 
                                        src={item.imageUrl || 'https://via.placeholder.com/300x200?text=No+Image'} 
                                        alt={item.itemName || 'Reported item'} 
                                    />
                                </div>
                                <div className="card-content-body">
                                    <span className="card-status-label">{item.status || 'Lost'}</span>
                                    <h3 className="card-title">{item.itemName || 'Unnamed Item'}</h3>
                                    
                                    <div className="card-location-group">
                                        <span className="location-label">Location:</span>
                                        <span className="location-text">{item.landmark || 'Not specified'}</span>
                                    </div>

                                    {item.description && (
                                        <p className="card-description">{item.description}</p>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {selectedItem && (
                <div className="details-modal-overlay" onClick={() => setSelectedItem(null)}>
                    <div className="details-modal-content bounce-in" onClick={(e) => e.stopPropagation()}>
                        <button className="close-details-btn" onClick={() => setSelectedItem(null)}>&times;</button>
                        <div className="modal-body-layout">
                            <div className="modal-image-box">
                                <img src={selectedItem.imageUrl || 'https://via.placeholder.com/350x180'} alt="" />
                            </div>
                            <div className="modal-info-details">
                                <h2><strong>Item name:</strong> {selectedItem.itemName}</h2>
                                <p><strong>Category:</strong> {selectedItem.category}</p>
                                <p><strong>Location:</strong> {selectedItem.landmark || 'Not specified'}</p>
                                <p className="modal-description-text">
                                    <strong>Description:</strong><br /> {selectedItem.description || 'No description provided.'}
                                </p>
                                
                                <div className="modal-footer-meta">
                                    <span className="modal-status-badge" data-status={selectedItem.status}>
                                        Status: {selectedItem.status}
                                    </span>
                                    <button 
                                        className="claim-action-btn"
                                        onClick={(e) => handleClaimItem(e, selectedItem)}
                                        disabled={isSendingClaim}
                                    >
                                        {isSendingClaim ? "Sending..." : "Claim Item"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default HomeStudent;