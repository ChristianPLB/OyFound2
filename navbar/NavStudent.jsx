import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";

import {
  Bell,
  Bot,
  Send,
  Sparkles,
  User,
  X,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { Link } from "react-router-dom";

import "../css/AISupportPage.css";
import { auth, db } from "../firebase";

const DEFAULT_AVATAR =
  "https://cdn-icons-png.flaticon.com/512/149/149071.png";

/*
|--------------------------------------------------------------------------
| Custom Drag Hook
|--------------------------------------------------------------------------
*/

const OYFOUND_FAQS = [
  {
    question: "what is oyfound",
    keyword: "oyfound",
    answer: "OyFound is a lost-and-found platform designed to help students, parents, and administrators report, search for, and manage lost and found items."
  },
  {
    question: "how does oyfound work",
    keyword: "work",
    answer: "OyFound allows users to report lost or found items, provide information about those items, search for possible matches, communicate with other users, and manage their reports."
  },
  {
    question: "what can i do",
    keyword: "students",
    answer: "As a student, you can report lost or found items, search for items, view your reports, communicate through messages, receive notifications, manage your profile, and use OyBot for help."
  },
  {
    question: "who can use oyfound",
    keyword: "users",
    answer: "OyFound is designed for students, parents, and administrators who are part of the school community."
  },
  {
    question: "how do i report a lost item",
    keyword: "lost",
    answer: "To report a lost item, open the reporting feature in OyFound and provide as much information as possible, such as the item name, description, location where it was lost, date, time, and identifying details."
  },
  {
    question: "what should i include in a lost report",
    keyword: "details",
    answer: "For a lost-item report, provide the item's name, detailed description, color, identifying characteristics, where you last saw it, approximately when you lost it, and any other information that could help identify it."
  },
  {
    question: "what if i lost my item",
    keyword: "lostitem",
    answer: "Create a lost-item report in OyFound with as many accurate details as possible. You can then monitor your reports, notifications, messages, and possible matches."
  },
  {
    question: "can i report something i lost",
    keyword: "property",
    answer: "Yes. Use OyFound's reporting feature to submit information about the item you lost."
  },
  {
    question: "how do i report a found item",
    keyword: "found",
    answer: "If you find an item, create a found-item report and provide details such as what the item is, where you found it, when you found it, its appearance, and other useful identifying information."
  },
  {
    question: "what should i do if i find something",
    keyword: "something",
    answer: "Report the found item through OyFound and provide accurate information about where and when you found it. Avoid unnecessarily exposing sensitive identifying details that should be used to verify the rightful owner."
  },
  {
    question: "what information should i provide for a found item",
    keyword: "information",
    answer: "Include the item's general description, location where it was found, date and approximate time, and other details that can help the rightful owner identify it."
  },
  {
    question: "how do i search",
    keyword: "search",
    answer: "Use the available search features in OyFound to look for reported items. Try useful terms such as the item's name, color, type, location, or other identifying information."
  },
  {
    question: "how can i find my lost item",
    keyword: "find",
    answer: "Search OyFound for reports that may correspond to your lost item. Compare details such as the item type, appearance, location, date, and identifying characteristics."
  },
  {
    question: "what if i cannot find my item",
    keyword: "results",
    answer: "If you don't find a matching report, keep your lost-item report updated and check OyFound again later. A matching found-item report may be submitted after your initial search."
  },
  {
    question: "what is a match",
    keyword: "match",
    answer: "A possible match is an item report that may correspond to another lost or found item based on available information."
  },
  {
    question: "how do matches work",
    keyword: "matching",
    answer: "Matching compares information associated with lost and found reports to help identify reports that may describe the same item."
  },
  {
    question: "what should i do when i find a match",
    keyword: "possible",
    answer: "Review the available details carefully. If the item appears to be yours, use the appropriate communication or claim process provided by OyFound rather than assuming ownership immediately."
  },
  {
    question: "how do i claim an item",
    keyword: "claim",
    answer: "If OyFound provides a claim option for the item, follow the claim process and provide the information required to demonstrate that the item belongs to you."
  },
  {
    question: "what happens after i claim an item",
    keyword: "claiming",
    answer: "After submitting a claim, follow the status of the claim through the application's available notifications, messages, or claim-management features."
  },
  {
    question: "can someone else claim my item",
    keyword: "someone",
    answer: "Claims should be verified using information that can establish ownership. If there is a dispute, follow the school's lost-and-found procedures or contact an administrator."
  },
  {
    question: "how do i edit my report",
    keyword: "edit",
    answer: "Open your report and use the available edit functionality to update its information."
  },
  {
    question: "how do i delete my report",
    keyword: "delete",
    answer: "Open the relevant report and use the available delete or removal option if it is provided. If you cannot remove it, contact an administrator."
  },
  {
    question: "can i update my report",
    keyword: "update",
    answer: "Yes, if the report provides an edit or update option. Keeping your report information accurate can make it easier to identify a matching item."
  },
  {
    question: "where are my reports",
    keyword: "reports",
    answer: "Check your dashboard or the section of OyFound where your submitted reports are displayed."
  },
  {
    question: "how do i send a message",
    keyword: "message",
    answer: "Use OyFound's messaging feature when communication with another user or an administrator is available."
  },
  {
    question: "where are my messages",
    keyword: "messages",
    answer: "Open the Messages section from your student navigation menu to view your available conversations."
  },
  {
    question: "why should i use messages",
    keyword: "communication",
    answer: "Messages can be used to communicate about lost and found items, possible matches, claims, or other relevant OyFound matters."
  },
  {
    question: "what are notifications",
    keyword: "notification",
    answer: "Notifications provide updates about relevant activity in OyFound, such as changes or events related to your reports and other application activity."
  },
  {
    question: "why did i get a notification",
    keyword: "new",
    answer: "A notification may be generated when there is relevant activity associated with your account or reports. Open the notification area to see the available details."
  },
  {
    question: "how do i edit my profile",
    keyword: "profile",
    answer: "Open your Profile and use the available profile-editing option to update your account information."
  },
  {
    question: "what is my profile",
    keyword: "account",
    answer: "Your profile contains information associated with your OyFound account. You can view and update the information that the application allows you to change."
  },
  {
    question: "how do i change my profile picture",
    keyword: "picture",
    answer: "Open your profile-editing page and use the available profile-picture option to update your photo."
  },
  {
    question: "how do i log in",
    keyword: "login",
    answer: "Use the OyFound login page and enter the credentials associated with your account."
  },
  {
    question: "i cannot login",
    keyword: "cannot",
    answer: "Check that your email and password are correct and that your account has completed any required verification. If you still cannot log in, use the available password-reset option or contact an administrator."
  },
  {
    question: "forgot my password",
    keyword: "password",
    answer: "Use the Forgot Password option on the login page and follow the password-reset instructions sent to your registered email address."
  },
  {
    question: "how do i logout",
    keyword: "logout",
    answer: "Open your Profile and use the Logout or Sign Out option."
  },
  {
    question: "is my account secure",
    keyword: "security",
    answer: "Protect your OyFound account by keeping your password private, using your own account, and signing out when using a shared device."
  },
  {
    question: "should i share my password",
    keyword: "share",
    answer: "No. Never share your OyFound password with another person."
  },
  {
    question: "privacy",
    keyword: "privacy",
    answer: "Only provide information that is necessary for your lost-and-found report or account. Avoid publicly posting sensitive personal information."
  },
  {
    question: "how do i contact an administrator",
    keyword: "administrator",
    answer: "Use the available contact or messaging features in OyFound to communicate with a school administrator. You can also use the Contact page if it is available."
  },
  {
    question: "what can administrators do",
    keyword: "admin",
    answer: "Administrators can manage relevant lost-and-found information and assist users with reports, claims, disputes, and other OyFound matters according to the application's available features."
  },
  {
    question: "what can parents do",
    keyword: "parents",
    answer: "Parent accounts can use the features made available to parents in OyFound. These may include viewing relevant information, communicating, and assisting with lost-and-found matters."
  },
  {
    question: "why use oyfound",
    keyword: "benefits",
    answer: "OyFound provides a centralized way for the school community to report, search for, communicate about, and manage lost-and-found items."
  },
  {
    question: "where can i get help",
    keyword: "help",
    answer: "I can help explain OyFound's features. You can also check the relevant page in the application or contact a school administrator for issues that require account or administrative assistance."
  },
  {
    question: "what should i do if i have a problem",
    keyword: "problem",
    answer: "First, check the relevant feature and make sure the information you entered is correct. If the problem continues, contact an administrator through the available contact or messaging options."
  }
];

function useDraggableWidget(initialX, initialY) {
  const [position, setPosition] = useState({
    x: initialX,
    y: initialY,
  });

  const [isDragging, setIsDragging] = useState(false);

  const dragRef = useRef({
    startX: 0,
    startY: 0,
    initialX,
    initialY,
    hasMoved: false,
  });

  const handleMouseDown = useCallback(
    (e) => {
      if (
        e.target.closest("input") ||
        (
          e.target.closest("button") &&
          !e.target.closest(".floating-ai-btn")
        )
      ) {
        return;
      }

      setIsDragging(true);

      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        initialX: position.x,
        initialY: position.y,
        hasMoved: false,
      };

      e.preventDefault();
    },
    [position]
  );

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;

      const dx =
        e.clientX - dragRef.current.startX;

      const dy =
        e.clientY - dragRef.current.startY;

      if (
        Math.abs(dx) > 5 ||
        Math.abs(dy) > 5
      ) {
        dragRef.current.hasMoved = true;
      }

      const boundedX = Math.max(
        10,
        Math.min(
          window.innerWidth - 120,
          dragRef.current.initialX + dx
        )
      );

      const boundedY = Math.max(
        70,
        Math.min(
          window.innerHeight - 90,
          dragRef.current.initialY + dy
        )
      );

      setPosition({
        x: boundedX,
        y: boundedY,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener(
        "mousemove",
        handleMouseMove
      );

      window.addEventListener(
        "mouseup",
        handleMouseUp
      );
    }

    return () => {
      window.removeEventListener(
        "mousemove",
        handleMouseMove
      );

      window.removeEventListener(
        "mouseup",
        handleMouseUp
      );
    };
  }, [isDragging]);

  return {
    position,
    isDragging,
    handleMouseDown,
    hasMoved: dragRef.current.hasMoved,
  };
}

/*
|--------------------------------------------------------------------------
| OyBot Robot Logo
|--------------------------------------------------------------------------
*/

function CombinedRobotLogoIcon({
  size = 40,
  color = "currentColor",
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 36 36"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle
        cx="18"
        cy="18"
        r="15"
        fill="#415A77"
        stroke="#778DA9"
        strokeWidth="2"
      />

      <circle
        cx="18"
        cy="18"
        r="10"
        stroke="#E0E1DD"
        strokeWidth="1"
        strokeDasharray="3 2"
        opacity="0.6"
      />

      <rect
        x="13"
        y="12"
        width="10"
        height="8"
        rx="2"
        fill="#E0E1DD"
        stroke="none"
      />

      <circle
        cx="15.5"
        cy="15.5"
        r="1"
        fill="#415A77"
        stroke="none"
      />

      <circle
        cx="20.5"
        cy="15.5"
        r="1"
        fill="#415A77"
        stroke="none"
      />

      <line
        x1="16"
        y1="18"
        x2="20"
        y2="18"
        stroke="#415A77"
        strokeWidth="1"
        strokeLinecap="round"
      />

      <line
        x1="18"
        y1="8"
        x2="18"
        y2="12"
        stroke="#E0E1DD"
        strokeWidth="1.5"
      />

      <circle
        cx="18"
        cy="7"
        r="1"
        fill="#E0E1DD"
        stroke="none"
      />
    </svg>
  );
}

/*
|--------------------------------------------------------------------------
| Notifications Menu
|--------------------------------------------------------------------------
*/

function NotificationMenu({
  notifications,
  onNotifClick,
}) {
  return (
    <div
      className="position-absolute start-0 mt-2 shadow-lg rounded p-2"
      style={{
        width: "240px",
        backgroundColor: "#1B263B",
        border: "1px solid #778DA9",
        zIndex: 1050,
      }}
    >
      <div className="d-flex justify-content-between align-items-center px-2 py-1 border-bottom border-secondary mb-2">
        <strong className="text-light small">
          Claim Status Updates
        </strong>

        <span
          className="badge bg-secondary text-light"
          style={{ fontSize: "0.65rem" }}
        >
          {notifications.length} Total
        </span>
      </div>

      <div
        style={{
          maxHeight: "260px",
          overflowY: "auto",
        }}
      >
        {notifications.length === 0 ? (
          <div className="text-center py-3 text-muted small">
            No claim updates yet.
          </div>
        ) : (
          notifications.map((notif) => {
            const isApproved =
              notif.status === "approved";

            return (
              <div
                key={notif.id}
                onClick={() =>
                  onNotifClick(notif)
                }
                className={`p-2 mb-1 rounded ${
                  notif.isRead
                    ? "opacity-60"
                    : ""
                }`}
                style={{
                  backgroundColor: isApproved
                    ? "rgba(25, 135, 84, 0.15)"
                    : "rgba(220, 53, 69, 0.15)",

                  borderLeft: `3px solid ${
                    isApproved
                      ? "#198754"
                      : "#dc3545"
                  }`,

                  cursor: "pointer",
                }}
              >
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span
                    className={`badge ${
                      isApproved
                        ? "bg-success"
                        : "bg-danger"
                    }`}
                    style={{
                      fontSize: "0.65rem",
                    }}
                  >
                    {isApproved
                      ? "Approved"
                      : "Rejected"}
                  </span>

                  {!notif.isRead && (
                    <span
                      className="badge bg-primary"
                      style={{
                        fontSize: "0.55rem",
                      }}
                    >
                      New
                    </span>
                  )}
                </div>

                <p
                  className="mb-0 text-light fw-bold small"
                  style={{
                    fontSize: "0.85rem",
                  }}
                >
                  {notif.itemName ||
                    "Unnamed Item"}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| AI Chat Drawer
|--------------------------------------------------------------------------
*/

function AIChatDrawer({
  isChatOpen,
  onClose,
  messages,
  isTyping,
  inputValue,
  setInputValue,
  onSend,
}) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }
  }, [
    messages,
    isTyping,
    isChatOpen,
  ]);

  if (!isChatOpen) return null;

  return (
    <div className="ai-chat-popup-card">
      {/* HEADER */}
      <div className="ai-popup-header">
        <div className="ai-popup-title-group">
          <div className="ai-popup-icon">
            <CombinedRobotLogoIcon size={24} />
          </div>

          <div>
            <h6 className="mb-0 d-flex align-items-center gap-1">
              OyBot
              <Sparkles
                size={12}
                color="#778DA9"
              />
            </h6>

            <span className="ai-status-online">
              Online • Ready to help
            </span>
          </div>
        </div>

        <button
          className="ai-close-btn"
          onClick={onClose}
          aria-label="Close Chat"
        >
          <X size={18} />
        </button>
      </div>

      {/* MESSAGES */}
      <div className="ai-popup-messages">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`ai-message-row ${msg.sender}`}
          >
            <div className="ai-avatar">
              {msg.sender === "ai" ? (
                <Bot size={14} />
              ) : (
                <User size={14} />
              )}
            </div>

            <div className="ai-bubble-content">
              <div className="ai-bubble">
                {msg.text}
              </div>

              <span className="ai-timestamp">
                {msg.timestamp}
              </span>
            </div>
          </div>
        ))}

        {/* TYPING INDICATOR */}
        {isTyping && (
          <div className="ai-message-row ai">
            <div className="ai-avatar">
              <Bot size={14} />
            </div>

            <div className="ai-bubble-content">
              <div className="ai-bubble typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* INPUT */}
      <div className="ai-popup-input-area">
        <input
          type="text"
          placeholder="Ask OyBot anything..."
          value={inputValue}
          disabled={isTyping}
          onChange={(e) =>
            setInputValue(e.target.value)
          }
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey
            ) {
              e.preventDefault();
              onSend();
            }
          }}
        />

        <button
          className="ai-popup-send"
          onClick={() => onSend()}
          disabled={
            !inputValue.trim() ||
            isTyping
          }
          aria-label="Send Message"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| MAIN NAVIGATION
|--------------------------------------------------------------------------
*/

export default function NavStudent({
  setRole,
  searchQuery,
  setSearchQuery,
}) {
  const [user, setUser] =
    useState(null);

  const [unreadCount, setUnreadCount] =
    useState(0);

  const [notifications, setNotifications] =
    useState([]);

  const [
    showNotifications,
    setShowNotifications,
  ] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | OyBot State
  |--------------------------------------------------------------------------
  */

  const [isChatOpen, setIsChatOpen] =
    useState(false);

  const [inputValue, setInputValue] =
    useState("");

  const [isTyping, setIsTyping] =
    useState(false);

  const [messages, setMessages] =
    useState([
      {
        sender: "ai",
        text:
          "Hello! I'm OyBot, your OyFound assistant. Ask me about lost and found items, reports, search, matches, claims, messages, notifications, profiles, accounts, parents, administrators, and more.",
        timestamp:
          new Date().toLocaleTimeString(
            [],
            {
              hour: "2-digit",
              minute: "2-digit",
            }
          ),
      },
    ]);

  /*
  |--------------------------------------------------------------------------
  | Floating Widget
  |--------------------------------------------------------------------------
  */

  const {
    position,
    isDragging,
    handleMouseDown,
    hasMoved,
  } = useDraggableWidget(
    window.innerWidth - 200,
    window.innerHeight - 95
  );

  /*
  |--------------------------------------------------------------------------
  | Authentication + Firestore Listeners
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    let unsubscribeNotifs = null;

    const unsubscribeAuth =
      onAuthStateChanged(
        auth,
        (currentUser) => {
          setUser(currentUser);

          if (currentUser) {
            const notifsRef =
              collection(
                db,
                "notifications"
              );

            const qNotifs = query(
              notifsRef,
              where(
                "userId",
                "==",
                currentUser.uid
              )
            );

            unsubscribeNotifs =
              onSnapshot(
                qNotifs,
                (snapshot) => {
                  setNotifications(
                    snapshot.docs.map(
                      (docSnapshot) => ({
                        id: docSnapshot.id,
                        ...docSnapshot.data(),
                      })
                    )
                  );
                },
                (err) => {
                  console.error(
                    "Error fetching notifications:",
                    err
                  );
                }
              );
          } else {
            setNotifications([]);
          }
        }
      );

    const reportsRef =
      collection(db, "reports");

    const qReports = query(
      reportsRef,
      where("status", "==", "new")
    );

    const unsubscribeReports =
      onSnapshot(
        qReports,
        (snapshot) => {
          setUnreadCount(
            snapshot.size
          );
        },
        (error) => {
          console.error(
            "Error fetching reports:",
            error
          );
        }
      );

    return () => {
      unsubscribeAuth();
      unsubscribeReports();

      if (unsubscribeNotifs) {
        unsubscribeNotifs();
      }
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | LOCAL OYBOT MESSAGE HANDLER
  |--------------------------------------------------------------------------
  | OyBot uses the local FAQ list. No OpenAI or paid AI backend is required.
  */

  const handleSendMessage = async (textToSend) => {
    const queryText = textToSend || inputValue;

    if (!queryText.trim() || isTyping) {
      return;
    }

    const cleanQuestion = queryText.trim();

    const getTime = () =>
      new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

    setMessages((prev) => [
      ...prev,
      {
        sender: "user",
        text: cleanQuestion,
        timestamp: getTime(),
      },
    ]);

    setInputValue("");
    setIsTyping(true);

    // Local FAQ only. No OpenAI, API key, Firebase Function,
    // or paid AI service is required.
    const normalizedQuestion = cleanQuestion
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const matchedFAQ = OYFOUND_FAQS.find((faq) => {
      const keyword = faq.keyword.toLowerCase().trim();
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const keywordPattern = new RegExp(`\\b${escapedKeyword}\\b`, "i");
      return keywordPattern.test(normalizedQuestion);
    });

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: matchedFAQ
            ? matchedFAQ.answer
            : "I don't have an answer for that yet. Try asking about OyFound, lost items, found items, reports, search, matches, claims, messages, notifications, profiles, accounts, parents, administrators, privacy, or help.",
          timestamp: getTime(),
        },
      ]);

      setIsTyping(false);
    }, 400);
  };

  /*
  |--------------------------------------------------------------------------
  | Notification Click
  |--------------------------------------------------------------------------
  */

  const handleNotifClick =
    async (notif) => {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notif.id
            ? {
                ...n,
                isRead: true,
              }
            : n
        )
      );

      try {
        await updateDoc(
          doc(
            db,
            "notifications",
            notif.id
          ),
          {
            isRead: true,
          }
        );
      } catch (err) {
        console.error(
          "Failed to mark notification as read:",
          err
        );
      }
    };

  const unreadNotifsCount =
    notifications.filter(
      (n) => !n.isRead
    ).length;

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <>
      {/* =========================================================
          SIDEBAR NAVIGATION
          ========================================================= */}

      <aside
        className="d-flex flex-column flex-shrink-0 p-3 bg-body-tertiary h-100"
        style={{
          width: "260px",
          minHeight: "100vh",
          borderRight:
            "1px solid rgba(119,141,169,0.2)",
        }}
      >
        {/* BRAND */}
        <Link
          className="d-flex align-items-center mb-3 text-decoration-none px-2"
          to="/student"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 260 50"
            width="200"
            height="40"
          >
            <defs>
              <style
                dangerouslySetInnerHTML={{
                  __html: `
                    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;700&display=swap');

                    .logo-text-base {
                      font-family: 'Poppins', sans-serif;
                      font-size: 24px;
                      letter-spacing: -0.4px;
                    }
                  `,
                }}
              />
            </defs>

            <g transform="translate(4, 3)">
              <path
                d="M22,2 C12,2 4,10 4,20 C4,31 22,46 22,46 C22,46 40,31 40,20 C40,10 32,2 22,2 Z"
                fill="#415A77"
              />

              <circle
                cx="22"
                cy="17"
                r="8"
                stroke="#E0E1DD"
                strokeWidth="3"
                fill="none"
              />

              <circle
                cx="22"
                cy="17"
                r="3"
                fill="#E0E1DD"
              />

              <line
                x1="28"
                y1="23"
                x2="35"
                y2="30"
                stroke="#778DA9"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            </g>

            <text
              x="56"
              y="32"
              className="logo-text-base"
            >
              <tspan
                fill="#778DA9"
                fontWeight="500"
              >
                Oy
              </tspan>

              <tspan
                fill="#E0E1DD"
                fontWeight="700"
              >
                Found
              </tspan>
            </text>
          </svg>
        </Link>

        <hr className="my-2" />

        {/* SEARCH */}
        <div className="mb-3 px-2">
          <input
            type="search"
            placeholder="Search items..."
            className="form-control form-control-sm"
            value={
              searchQuery || ""
            }
            onChange={(e) =>
              setSearchQuery(
                e.target.value
              )
            }
          />
        </div>

        {/* NAVIGATION */}
        <ul className="nav nav-pills flex-column mb-auto gap-1">
          <li className="nav-item">
            <Link
              to="/student"
              className="nav-link link-body-emphasis"
            >
              Home
            </Link>
          </li>

          <li className="nav-item">
            <Link
              to="/studentdashboard"
              className="nav-link link-body-emphasis"
            >
              Dashboard
            </Link>
          </li>

          {/* MESSAGES */}
          <li className="nav-item">
            <Link
              to="/studentmessages"
              className="nav-link link-body-emphasis d-flex align-items-center justify-content-between"
            >
              <span>
                Messages
              </span>

              {unreadCount > 0 && (
                <span
                  className="badge rounded-pill bg-danger"
                  style={{
                    fontSize:
                      "0.65rem",
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </Link>
          </li>

          {/* NOTIFICATIONS */}
          <li className="nav-item position-relative">
            <button
              className="nav-link link-body-emphasis border-0 bg-transparent w-100 text-start d-flex align-items-center justify-content-between"
              onClick={() =>
                setShowNotifications(
                  !showNotifications
                )
              }
            >
              <span className="d-flex align-items-center gap-2">
                <Bell
                  size={18}
                  color="#E0E1DD"
                />

                Notifications
              </span>

              {unreadNotifsCount >
                0 && (
                <span
                  className="badge rounded-pill bg-danger"
                  style={{
                    fontSize:
                      "0.65rem",
                  }}
                >
                  {
                    unreadNotifsCount
                  }
                </span>
              )}
            </button>

            {showNotifications && (
              <NotificationMenu
                notifications={
                  notifications
                }
                onNotifClick={
                  handleNotifClick
                }
              />
            )}
          </li>
        </ul>

        <hr className="my-3" />

        {/* PROFILE */}
        {user && (
          <div className="d-flex align-items-center px-2">
            <Link
              to="/profile"
              className="d-flex align-items-center text-decoration-none gap-2 overflow-hidden w-100"
            >
              <img
                src={
                  user.photoURL ||
                  DEFAULT_AVATAR
                }
                alt="Profile"
                className="rounded-circle flex-shrink-0"
                style={{
                  width: "36px",
                  height: "36px",
                  objectFit: "cover",
                  border:
                    "2px solid #778DA9",
                }}
              />

              <span
                className="small text-truncate"
                style={{
                  color: "#E0E1DD",
                  fontWeight: "500",
                }}
                title={
                  user.displayName ||
                  user.email
                }
              >
                {user.displayName ||
                  user.email?.split(
                    "@"
                  )[0]}
              </span>
            </Link>
          </div>
        )}
      </aside>

      {/* =========================================================
          FLOATING OYBOT
          ========================================================= */}

      <div
        className="floating-ai-wrapper"
        style={{
          position: "fixed",
          left: `${position.x}px`,
          top: `${position.y}px`,
          bottom: "auto",
          right: "auto",
          cursor: isDragging
            ? "grabbing"
            : "auto",
          zIndex: 1060,
        }}
        onMouseDown={
          handleMouseDown
        }
      >
        {/* CHAT WINDOW */}
        <AIChatDrawer
          isChatOpen={
            isChatOpen
          }
          onClose={() =>
            setIsChatOpen(false)
          }
          messages={messages}
          isTyping={isTyping}
          inputValue={inputValue}
          setInputValue={
            setInputValue
          }
          onSend={
            handleSendMessage
          }
        />

        {/* FLOATING BUTTON */}
        <button
          className="floating-ai-btn"
          onClick={() => {
            if (!hasMoved) {
              setIsChatOpen(
                !isChatOpen
              );
            }
          }}
          title="Ask OyBot anything or hold and drag"
          style={{
            cursor: "grab",
            padding:
              "10px 16px",
            borderRadius:
              "35px",
            display: "flex",
            alignItems:
              "center",
            gap: "10px",
          }}
        >
          <CombinedRobotLogoIcon
            size={38}
          />

          <span
            className="floating-ai-text"
            style={{
              fontWeight: "600",
              fontSize:
                "0.95rem",
              whiteSpace:
                "nowrap",
            }}
          >
            OyBot
          </span>
        </button>
      </div>
    </>
  );
}