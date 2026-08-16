import { useState, useEffect } from "react";
import "./App.css";
import StudentsPage from "./components/StudentsPage";
import PerformanceCalendar from "./components/PerformanceCalendar";
import ClassPerformancePage from "./components/ClassPerformancePage";
import { fetchDashboardData } from "./services/dashboardData";

import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from "recharts";

function App() {
    const [activeTab, setActiveTab] = useState("dashboard");
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        fetchDashboardData()
            .then((data) => {
                if (isMounted) {
                    setDashboardData(data);
                    setLoading(false);
                }
            })
            .catch((err) => {
                console.error("Failed to load dashboard data:", err);
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    const summary = dashboardData?.summary || {};
    const dailyData = dashboardData?.dailyTrend || [];
    const topPerformers = dashboardData?.topPerformers || [];
    const latestDateStr = dashboardData?.latestDateFormatted || "Today";

    const easyTotal = summary.easyTotal || 0;
    const mediumTotal = summary.mediumTotal || 0;
    const hardTotal = summary.hardTotal || 0;
    const totalSolved = summary.totalProblemsSolved || 1;

    const easyPct = Math.min(100, Math.round((easyTotal / totalSolved) * 100)) || 0;
    const mediumPct = Math.min(100, Math.round((mediumTotal / totalSolved) * 100)) || 0;
    const hardPct = Math.min(100, Math.round((hardTotal / totalSolved) * 100)) || 0;

    return (
        <div className="app">

            {/* Sidebar */}
            <aside className="sidebar">
                <div className="brand">
                    <div className="brand-logo">CSD</div>

                    <div>
                        <h2>LeetCode</h2>
                        <span>Tracker</span>
                    </div>
                </div>

                <nav className="navigation">
                    <a
                        className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`}
                        href="#"
                        onClick={(e) => {
                            e.preventDefault();
                            setActiveTab("dashboard");
                        }}
                    >
                        <span>📊</span>
                        Dashboard
                    </a>

                    <a
                        className={`nav-item ${activeTab === "students" ? "active" : ""}`}
                        href="#"
                        onClick={(e) => {
                            e.preventDefault();
                            setActiveTab("students");
                        }}
                    >
                        <span>👨‍🎓</span>
                        Students
                    </a>

                    <a
                        className={`nav-item ${activeTab === "class-performance" ? "active" : ""}`}
                        href="#"
                        onClick={(e) => {
                            e.preventDefault();
                            setActiveTab("class-performance");
                        }}
                    >
                        <span>🏫</span>
                        Class Performance
                    </a>

                    <a className="nav-item" href="#" onClick={(e) => e.preventDefault()}>
                        <span>🏆</span>
                        Leaderboard
                    </a>

                    <a className="nav-item" href="#" onClick={(e) => e.preventDefault()}>
                        <span>📈</span>
                        Analytics
                    </a>

                    <a className="nav-item" href="#" onClick={(e) => e.preventDefault()}>
                        <span>📄</span>
                        Reports
                    </a>

                    <a className="nav-item" href="#" onClick={(e) => e.preventDefault()}>
                        <span>🤖</span>
                        AI Assistant
                    </a>
                </nav>

                <div className="sidebar-bottom">
                    <a className="nav-item" href="#" onClick={(e) => e.preventDefault()}>
                        <span>⚙️</span>
                        Settings
                    </a>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                {activeTab === "students" && <StudentsPage dashboardData={dashboardData} />}

                {activeTab === "class-performance" && <ClassPerformancePage dashboardData={dashboardData} />}

                {activeTab === "dashboard" && (
                    <>
                        {/* Header */}
                        <header className="topbar">
                            <div>
                                <h1>Dashboard</h1>
                                <p>CSD LeetCode Performance Tracker</p>
                            </div>

                            <div className="profile">
                                {dashboardData?.isFallback && (
                                    <span style={{ fontSize: "11px", background: "#fef3c7", color: "#b45309", padding: "4px 8px", borderRadius: "6px", fontWeight: "600" }}>
                                        Dev Sample Data
                                    </span>
                                )}
                                <div className="notification">🔔</div>

                                <div className="avatar">KS</div>

                                <div className="profile-info">
                                    <strong>CSD Faculty</strong>
                                    <span>Administrator</span>
                                </div>
                            </div>
                        </header>

                        {/* Welcome */}
                        <section className="welcome">
                            <div>
                                <h2>Welcome to CSD LeetCode Tracker 👋</h2>

                                <p>
                                    Monitor student coding performance, progress and
                                    problem-solving activity.
                                </p>
                            </div>

                            <div className="date-box">
                                <span>Latest Data</span>
                                <strong>{loading ? "Loading..." : latestDateStr}</strong>
                            </div>
                        </section>

                        {/* Statistics */}
                        <section className="stats-grid">

                            <div className="stat-card">
                                <div className="stat-icon students-icon">
                                    👨‍🎓
                                </div>

                                <div>
                                    <p>Total Students</p>
                                    <h3>{loading ? "..." : (summary.totalStudents || 0)}</h3>
                                    <span className="positive">
                                        {summary.activeStudents || 0} Active students
                                    </span>
                                </div>
                            </div>

                            <div className="stat-card">
                                <div className="stat-icon solved-icon">
                                    ✓
                                </div>

                                <div>
                                    <p>Total Problems Solved</p>
                                    <h3>{loading ? "..." : (summary.totalProblemsSolved?.toLocaleString() || 0)}</h3>
                                    <span className="positive">
                                        +{summary.solvedToday || 0} today
                                    </span>
                                </div>
                            </div>

                            <div className="stat-card">
                                <div className="stat-icon today-icon">
                                    ⚡
                                </div>

                                <div>
                                    <p>Solved Today</p>
                                    <h3>{loading ? "..." : (summary.solvedToday || 0)}</h3>
                                    <span className="positive">
                                        Active department solutions
                                    </span>
                                </div>
                            </div>

                            <div className="stat-card">
                                <div className="stat-icon improvement-icon">
                                    📈
                                </div>

                                <div>
                                    <p>Weekly Improvement</p>
                                    <h3>{loading ? "..." : `+${summary.weeklyImprovement || 0}`}</h3>
                                    <span className="positive">
                                        Problems solved
                                    </span>
                                </div>
                            </div>

                        </section>

                        {/* Charts & Difficulty */}
                        <section className="content-grid">

                            {/* Daily Problem Solving */}
                            <div className="panel large-panel">

                                <div className="panel-header">
                                    <div>
                                        <h3>Daily Problem Solving</h3>

                                        <p>
                                            Problems solved by students over the last
                                            7 days
                                        </p>
                                    </div>

                                    <select defaultValue="Last 7 Days">
                                        <option>Last 7 Days</option>
                                    </select>
                                </div>

                                {/* Recharts */}
                                <div className="chart-container">
                                    <ResponsiveContainer
                                        width="100%"
                                        height={260}
                                    >
                                        <LineChart
                                            data={dailyData}
                                            margin={{
                                                top: 10,
                                                right: 20,
                                                left: 0,
                                                bottom: 5,
                                            }}
                                        >
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                            />

                                            <XAxis dataKey="day" />

                                            <YAxis
                                                allowDecimals={false}
                                            />

                                            <Tooltip
                                                formatter={(value) => [
                                                    `${value} problems`,
                                                    "Solved",
                                                ]}
                                            />

                                            <Line
                                                type="monotone"
                                                dataKey="solved"
                                                stroke="#2563eb"
                                                strokeWidth={3}
                                                dot={{ r: 5 }}
                                                activeDot={{ r: 7 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>

                            </div>

                            {/* Problem Distribution */}
                            <div className="panel">

                                <div className="panel-header">
                                    <div>
                                        <h3>Problem Distribution</h3>
                                        <p>Difficulty breakdown</p>
                                    </div>
                                </div>

                                <div className="difficulty">

                                    <div className="difficulty-item">
                                        <div className="difficulty-label">
                                            <span>Easy</span>
                                            <strong>{easyTotal.toLocaleString()}</strong>
                                        </div>

                                        <div className="progress">
                                            <div
                                                className="progress-easy"
                                                style={{ width: `${easyPct}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    <div className="difficulty-item">
                                        <div className="difficulty-label">
                                            <span>Medium</span>
                                            <strong>{mediumTotal.toLocaleString()}</strong>
                                        </div>

                                        <div className="progress">
                                            <div
                                                className="progress-medium"
                                                style={{ width: `${mediumPct}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    <div className="difficulty-item">
                                        <div className="difficulty-label">
                                            <span>Hard</span>
                                            <strong>{hardTotal.toLocaleString()}</strong>
                                        </div>

                                        <div className="progress">
                                            <div
                                                className="progress-hard"
                                                style={{ width: `${hardPct}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                </div>
                            </div>

                        </section>

                        {/* Performance Calendar Section */}
                        <section style={{ marginBottom: "22px" }}>
                            <PerformanceCalendar dashboardData={dashboardData} />
                        </section>

                        {/* Leaderboard */}
                        <section className="panel leaderboard-panel">

                            <div className="panel-header">
                                <div>
                                    <h3>Top Performers</h3>

                                    <p>
                                        Students with the highest number of solved
                                        problems
                                    </p>
                                </div>

                                <button
                                    className="view-button"
                                    onClick={() => setActiveTab("students")}
                                >
                                    View Leaderboard →
                                </button>
                            </div>

                            <div className="leaderboard">

                                <div className="leader-row header-row">
                                    <span>Rank</span>
                                    <span>Student</span>
                                    <span>Easy</span>
                                    <span>Medium</span>
                                    <span>Hard</span>
                                    <span>Total</span>
                                    <span>Improvement</span>
                                </div>

                                {topPerformers.map((student, idx) => {
                                    const rank = idx + 1;
                                    const rankClass = rank === 1 ? "first" : rank === 2 ? "second" : rank === 3 ? "third" : "";
                                    return (
                                        <div className="leader-row" key={student.id || idx}>
                                            <span className={`rank ${rankClass}`}>{rank}</span>
                                            <span className="student-name">
                                                {student.name}
                                            </span>
                                            <span>{student.easy}</span>
                                            <span>{student.medium}</span>
                                            <span>{student.hard}</span>
                                            <strong>{student.totalSolved}</strong>
                                            <span className="positive">+{student.improvement}</span>
                                        </div>
                                    );
                                })}

                            </div>
                        </section>
                    </>
                )}

            </main>
        </div>
    );
}

export default App;