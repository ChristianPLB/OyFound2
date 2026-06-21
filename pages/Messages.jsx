import { onAuthStateChanged } from "firebase/auth";
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, writeBatch } from "firebase/firestore";
import { useEffect, useRef, useState } from 'react';
import { auth, db } from '../firebase';

const DEFAULT_ICON = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

function Messages() {
    const [currentUser, setCurrentUser] = useState(null);
    const [conversations, setConversations] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [loading, setLoading] = useState(true);
    const [replyText, setReplyText] = useState("");
    const [chatHistory, setChatHistory] = useState([]);
    const [contextMenu, setContextMenu] = useState(null);
    const chatEndRef = useRef(null);

    const deleteMessage = async (messageId) => {
        if (!currentUser || !selectedChat?.id) return;
        
        try {
            await deleteDoc(doc(db, "messages", selectedChat.id, "replies", messageId));
            hideContextMenu();
        } catch (error) {
            console.error("Error deleting message:", error);
            alert("Failed to delete message");
        }
    };

    // ✅ FIXED: Better batch delete for conversations
    const deleteConversation = async (conversationId) => {
        if (!currentUser) return;
        
        try {
            const batch = writeBatch(db);
            
            // Get all replies and delete them
            const repliesQuery = query(collection(db, "messages", conversationId, "replies"));
            const repliesSnapshot = await new Promise((resolve) => {
                onSnapshot(repliesQuery, (snapshot) => resolve(snapshot));
            });
            
            repliesSnapshot.docs.forEach((replyDoc) => {
                batch.delete(doc(db, "messages", conversationId, "replies", replyDoc.id));
            });
            
            // Delete main conversation
            batch.delete(doc(db, "messages", conversationId));
            
            await batch.commit();
            hideContextMenu();
            console.log("Conversation deleted successfully");
        } catch (error) {
            console.error("Error deleting conversation:", error);
            alert("Failed to delete conversation");
        }
    };

    const showContextMenu = (e, messageId = null, isConversation = false) => {
        e.preventDefault();
        setContextMenu({
            x: e.pageX,
            y: e.pageY,
            messageId,
            isConversation
        });
    };

    const hideContextMenu = () => {
        setContextMenu(null);
    };

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            setLoading(false);
        });
        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatHistory]);

    useEffect(() => {
        if (!currentUser) return;
        const q = query(collection(db, "messages"), orderBy("timestamp", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const convos = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setConversations(convos);
        });
        return () => unsubscribe();
    }, [currentUser]);

    const selectAndMarkRead = async (chat) => {
        setSelectedChat(chat);
        if (chat.unread) {
            try {
                await updateDoc(doc(db, "messages", chat.id), { unread: false });
            } catch (error) {
                console.error("Error marking read:", error);
            }
        }
    };

    useEffect(() => {
        if (!selectedChat?.id) return;
        
        const repliesQuery = query(
            collection(db, "messages", selectedChat.id, "replies"),
            orderBy("timestamp", "asc")
        );
        const unsubscribe = onSnapshot(repliesQuery, (snapshot) => {
            setChatHistory(snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })));
        });
        return () => unsubscribe();
    }, [selectedChat?.id]);

   const handleSendMessage = async () => {
    if (!replyText.trim() || !selectedChat || !currentUser) return;
    
    try {
        const displayName = currentUser.displayName || "Admin";
        await addDoc(collection(db, "messages", selectedChat.id, "replies"), {
            text: replyText,
            sender: "admin",
            senderId: currentUser.uid,
            senderName: displayName,
            role: 'admin',
            timestamp: serverTimestamp()
        });
        setReplyText("");
    } catch (error) {
        console.error("Error replying:", error);
    }
};

    if (loading) return <div className="loading-overlay"><div className="spinner"></div></div>;

    return (
        <div className="messages-container" onClick={hideContextMenu} onContextMenu={(e) => e.preventDefault()}>
            <div className="messages-sidebar">
                <div className="sidebar-header">
                    <h2>Messages</h2>
                </div>
                <div className="conversation-list">
                    {conversations.map((chat) => (
                        <div 
                            key={chat.id} 
                            onClick={() => selectAndMarkRead(chat)}
                            onContextMenu={(e) => showContextMenu(e, chat.id, true)}
                            className={`convo-item ${selectedChat?.id === chat.id ? 'active' : ''}`}
                        >
                            <div className="convo-avatar-wrapper">
                                <img src={chat.avatarUrl || DEFAULT_ICON} alt="" className="convo-avatar" />
                                {chat.unread && <span className="unread-badge"></span>}
                            </div>
                            <div className="convo-info">
                                <strong>{chat.fullName || "Unknown User"}</strong>
                                <p className={chat.unread ? 'unread-bold' : ''}>{chat.message}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="chat-main-area">
                {selectedChat ? (
                    <>
                        <div className="chat-header">
                            <div className="chat-header-user">
                                <img src={selectedChat.avatarUrl || DEFAULT_ICON} alt="" className="header-avatar" />
                                <div>
                                    <h4>{selectedChat.fullName || "Anonymous User"}</h4>
                                    <span>{selectedChat.email || "No email provided"}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="chat-history">
                {chatHistory.map((msg) => {
                    const isYourMessage = msg.role === 'admin' || 
                                        msg.senderId === currentUser?.uid ||
                                        msg.senderName === (currentUser?.displayName || "Admin");
                    
                    return (
                        <div key={msg.id} className={`msg-row ${isYourMessage ? 'msg-sent' : 'msg-received'}`} 
                            onContextMenu={(e) => showContextMenu(e, msg.id)}>
                            {!isYourMessage && (
                                <img src={selectedChat.avatarUrl || DEFAULT_ICON} alt="" className="msg-avatar" />
                            )}
                            <div className={isYourMessage ? 'sent-container' : 'received-container'}>
                                <div className={`msg-bubble ${isYourMessage ? 'sent' : 'received'}`}>
                                    {msg.text}
                                </div>
                                <span className="msg-time">
                                    {msg.timestamp?.toDate()?.toLocaleTimeString([], { 
                                        hour: '2-digit', minute: '2-digit' 
                                    }) || '...'}
                                </span>
                            </div>
                        </div>
                    );
                })}
                                            <div ref={chatEndRef} />
                                        </div>

                                <div className="chat-input-section">
                    <div className="input-box-container">
                        <div className="input-with-sender">
                            <textarea 
                                placeholder="Type your message..." 
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                onKeyDown={(e) => { 
                                    if(e.key === 'Enter' && !e.shiftKey) { 
                                        e.preventDefault(); 
                                        handleSendMessage(); 
                                    } 
                                }}
                            />
                            <span className="sender-tag-right">
                                {currentUser?.displayName || 'Admin'}
                            </span>
                        </div>
                        <button 
                            className="send-btn" 
                            onClick={handleSendMessage}
                            disabled={!replyText.trim() || !currentUser}
                        >
                            Reply
                        </button>
                    </div>
                </div>
                                    </>
                                ) : (
                                    <div className="empty-chat-state">
                                        <p>Select a message to view details</p>
                                    </div>
                                )}
                            </div>

                            {contextMenu && (
                                <div 
                                    className="context-menu"
                                    style={{
                                        position: 'fixed',
                                        left: `${contextMenu.x}px`,
                                        top: `${contextMenu.y}px`,
                                        zIndex: 10000
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {contextMenu.isConversation ? (
                                        <div
                                            className="context-menu-item delete-item"
                                            onClick={() => deleteConversation(contextMenu.messageId)}
                                        >
                                            🗑️ Delete Conversation
                                        </div>
                                    ) : (
                                        <div
                                            className="context-menu-item delete-item"
                                            onClick={() => deleteMessage(contextMenu.messageId)}
                                        >
                                            🗑️ Delete Message
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                }

export default Messages;