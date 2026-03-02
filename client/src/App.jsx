import { useState, useEffect, useCallback, useRef } from "react";
import SearchForm from "./components/SearchForm";
import CourseTable from "./components/CourseTable";
import NotifyPrefsPanel from "./components/NotifyPrefsPanel";
import LoginPage from "./components/LoginPage";
import UserMenu from "./components/UserMenu";
import { useAuth } from "./context/AuthContext";
import { useWatchedCourses } from "./hooks/useWatchedCourses";
import { useNotifyPrefs } from "./hooks/useNotifyPrefs";
import { auth } from "./firebase";
import "./index.css";

// In production set VITE_API_URL=https://test-api.smashit.tw in your .env
const API_BASE = import.meta.env.VITE_API_URL ?? "";
const POLL_INTERVAL_MS = 60_000; // 1 minute

// ─────────────────────────────────────────────────────────────────────────────
// Inner component – only rendered when the user is authenticated.
// Keeping it separate ensures all hooks are called unconditionally.
// ─────────────────────────────────────────────────────────────────────────────
function TrackerApp({ uid }) {
  const { watchedCourses, watchCourse, unwatchCourse, isWatched, toggleNotify, isNotifyEnabled } =
    useWatchedCourses(uid);
  const { prefs, savePrefs } = useNotifyPrefs(uid);

  const [query, setQuery] = useState({
    Semester: "1142",
    CourseNo: "",
    CourseName: "",
    CourseTeacher: "",
  });

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [isPolling, setIsPolling] = useState(false);
  const [activeTab, setActiveTab] = useState("search"); // 'search' | 'watched' | 'notifications'

  // Track previous enrollment state for slot-opening detection
  const prevStateRef = useRef(new Map()); // CourseNo → { wasFull }

  function isFull(course) {
    const limit = parseInt(course.Restrict1, 10);
    return !isNaN(limit) && limit > 0 && course.ChooseStudent >= limit;
  }

  function addToast(message) {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 8000);
  }

  const fetchCourses = useCallback(
    async (isInitial = false) => {
      if (!query.CourseNo && !query.CourseName && !query.CourseTeacher) {
        setError("Please enter at least one search field (Course No, Name, or Teacher).");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch(`${API_BASE}/api/courses`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(query),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }

        const data = await res.json();
        setCourses(data);
        setLastUpdated(new Date());

        if (isInitial) {
          // Seed state on first fetch – no alerts yet
          const map = new Map();
          data.forEach((c) => map.set(c.CourseNo, { wasFull: isFull(c) }));
          prevStateRef.current = map;
        } else {
          // Check for slot openings
          data.forEach((course) => {
            const prev = prevStateRef.current.get(course.CourseNo);
            const nowFull = isFull(course);
            if (prev?.wasFull && !nowFull) {
              addToast(
                `🎉 Slot opened: ${course.CourseNo} ${course.CourseName}`
              );
            }
            prevStateRef.current.set(course.CourseNo, { wasFull: nowFull });
          });
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [query]
  );

  // Start / stop auto-polling
  useEffect(() => {
    if (!isPolling) return;

    fetchCourses(true);
    const intervalId = setInterval(() => fetchCourses(false), POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [isPolling, fetchCourses]);

  function handleSearch() {
    // If already polling, restart with new query
    setIsPolling(false);
    setTimeout(() => setIsPolling(true), 0);
  }

  function handleStopPolling() {
    setIsPolling(false);
  }

  const displayedCourses =
    activeTab === "watched" ? watchedCourses : courses;
  const showCourseTable = activeTab === "search" || activeTab === "watched";

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div>
            <h1>NTUST Course Tracker</h1>
            <p className="subtitle">Monitor course availability in real time</p>
          </div>
          <UserMenu />
        </div>

        <div className="tabs">
          <button
            className={`tab ${activeTab === "search" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("search")}
          >
            Search
          </button>
          <button
            className={`tab ${activeTab === "watched" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("watched")}
          >
            Watchlist
            {watchedCourses.length > 0 && (
              <span className="tab-badge">{watchedCourses.length}</span>
            )}
          </button>
          <button
            className={`tab ${activeTab === "notifications" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("notifications")}
          >
            🔔 Notifications
          </button>
        </div>
      </header>

      <main className="app-main">
        {activeTab === "search" && (
          <SearchForm
            query={query}
            onChange={setQuery}
            onSearch={handleSearch}
            onStop={handleStopPolling}
            isPolling={isPolling}
            loading={loading}
          />
        )}

        {error && <div className="error-banner">{error}</div>}

        {activeTab === "search" && lastUpdated && (
          <div className="status-bar">
            <span>
              {courses.length} course{courses.length !== 1 ? "s" : ""} found
            </span>
            <span>
              Last updated: {lastUpdated.toLocaleTimeString("zh-TW")}
              {isPolling && (
                <span className="polling-badge"> • Auto-refreshing every 60s</span>
              )}
            </span>
          </div>
        )}

        {activeTab === "watched" && watchedCourses.length === 0 && (
          <div className="placeholder">
            <p>Your watchlist is empty. Search for courses and click ★ to watch them.</p>
          </div>
        )}

        {showCourseTable && (
          <CourseTable
            courses={displayedCourses}
            loading={loading && activeTab === "search"}
            isWatched={isWatched}
            onWatch={watchCourse}
            onUnwatch={unwatchCourse}
            isNotifyEnabled={isNotifyEnabled}
            onToggleNotify={toggleNotify}
          />
        )}

        {activeTab === "notifications" && (
          <NotifyPrefsPanel prefs={prefs} onSave={savePrefs} />
        )}
      </main>

      {/* Toast notifications */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root component – resolves auth then renders the right screen.
// ─────────────────────────────────────────────────────────────────────────────
function App() {
  const { user } = useAuth();

  if (user === undefined) {
    // Firebase is still initialising
    return (
      <div className="app-loading">
        <div className="spinner" />
      </div>
    );
  }

  if (user === null) return <LoginPage />;

  return <TrackerApp uid={user.uid} />;
}

export default App;
