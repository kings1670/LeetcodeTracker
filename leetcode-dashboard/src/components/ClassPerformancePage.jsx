import { useState, useMemo } from "react";
import {
    getAvailableClasses,
    getClassSummary,
    getClassDailyTrend,
    getClassTopPerformers
} from "../services/dashboardData";
import "./ClassPerformancePage.css";

import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from "recharts";

function ClassPerformancePage({ dashboardData, onSelectStudent }) {
    const [selectedClass, setSelectedClass] = useState("III CSD A");
    const [timeframe, setTimeframe] = useState("7d");

    const availableClasses = useMemo(() => getAvailableClasses(dashboardData), [dashboardData]);

    useEffect(() => {
        if (availableClasses.length > 0 && !availableClasses.includes(selectedClass)) {
            setSelectedClass(availableClasses[0]);
        }
    }, [availableClasses, selectedClass]);

    const summary = useMemo(() => {
        return getClassSummary(dashboardData, selectedClass);
    }, [dashboardData, selectedClass]);

    const dailyTrendData = useMemo(() => {
        return getClassDailyTrend(dashboardData, selectedClass, timeframe);
    }, [dashboardData, selectedClass, timeframe]);

    const topPerformers = useMemo(() => {
        return getClassTopPerformers(dashboardData, selectedClass);
    }, [dashboardData, selectedClass]);

    const totalSolved = summary.totalProblemsSolved || 1;
    const easyTotal = summary.easyTotal || 0;
    const mediumTotal = summary.mediumTotal || 0;
    const hardTotal = summary.hardTotal || 0;

    const easyPct = Math.min(100, Math.round((easyTotal / totalSolved) * 100)) || 0;
    const mediumPct = Math.min(100, Math.round((mediumTotal / totalSolved) * 100)) || 0;
    const hardPct = Math.min(100, Math.round((hardTotal / totalSolved) * 100)) || 0;

    return (
        <div className="class-container">
            {/* Page Header */}
            <header className="class-header">
                <div>
                    <h1>Class Performance</h1>
                    <p>Track problem-solving trends and statistics by department & class section</p>
                </div>

                <div className="class-selector-box">
                    <label htmlFor="class-select">Select Class:</label>
                    <select
                        id="class-select"
                        className="class-select-dropdown"
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                    >
                        {availableClasses.map((cls) => (
                            <option key={cls} value={cls}>{cls}</option>
                        ))}
                    </select>
                </div>
            </header>

            {/* Summary Cards */}
            <section className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon students-icon">👨‍🎓</div>
                    <div>
                        <p>Total Students</p>
                        <h3>{summary.totalStudents || 0}</h3>
                        <span className="positive">
                            {summary.activeStudents || 0} Active students
                        </span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon solved-icon">✓</div>
                    <div>
                        <p>Total Problems Solved</p>
                        <h3>{(summary.totalProblemsSolved || 0).toLocaleString()}</h3>
                        <span className="positive">
                            +{summary.solvedToday || 0} today
                        </span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon today-icon">⚡</div>
                    <div>
                        <p>Average Solved / Student</p>
                        <h3>{summary.avgSolved || 0}</h3>
                        <span className="positive">Problems per student</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon improvement-icon">📈</div>
                    <div>
                        <p>Weekly Improvement</p>
                        <h3>+{summary.weeklyImprovement || 0}</h3>
                        <span className="positive">Problems solved</span>
                    </div>
                </div>
            </section>

            {/* Charts & Distribution */}
            <section className="content-grid">
                {/* Performance Trend Chart */}
                <div className="panel large-panel">
                    <div className="panel-header">
                        <div>
                            <h3>Performance Trend — {selectedClass}</h3>
                            <p>Total problems solved over time</p>
                        </div>

                        <select
                            value={timeframe}
                            onChange={(e) => setTimeframe(e.target.value)}
                        >
                            <option value="7d">Last 7 Days</option>
                            <option value="30d">Last 30 Days</option>
                            <option value="all">All Available Data</option>
                        </select>
                    </div>

                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={260}>
                            <LineChart
                                data={dailyTrendData}
                                margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="day" />
                                <YAxis allowDecimals={false} />
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

                {/* Difficulty Distribution */}
                <div className="panel">
                    <div className="panel-header">
                        <div>
                            <h3>Difficulty Distribution</h3>
                            <p>Difficulty breakdown for {selectedClass}</p>
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

            {/* Class Top Performers */}
            <section className="panel leaderboard-panel">
                <div className="panel-header">
                    <div>
                        <h3>Top Performers — {selectedClass}</h3>
                        <p>Students with the highest number of solved problems in {selectedClass}</p>
                    </div>
                </div>

                <div className="leaderboard">
                    <div className="leader-row header-row">
                        <span>Rank</span>
                        <span>Student Name</span>
                        <span>Register Number</span>
                        <span>Easy</span>
                        <span>Medium</span>
                        <span>Hard</span>
                        <span>Total</span>
                        <span>Improvement</span>
                    </div>

                    {topPerformers.length > 0 ? (
                        topPerformers.map((student, idx) => {
                            const rank = idx + 1;
                            const rankClass = rank === 1 ? "first" : rank === 2 ? "second" : rank === 3 ? "third" : "";
                            return (
                                <div
                                    className="leader-row"
                                    key={student.id || idx}
                                    onClick={() => onSelectStudent && onSelectStudent(student)}
                                    style={{ cursor: "pointer" }}
                                >
                                    <span className={`rank ${rankClass}`}>{rank}</span>
                                    <span className="student-name">{student.name}</span>
                                    <span className="roll-cell">{student.rollNumber}</span>
                                    <span>{student.easy}</span>
                                    <span>{student.medium}</span>
                                    <span>{student.hard}</span>
                                    <strong>{student.totalSolved}</strong>
                                    <span className="positive">+{student.improvement}</span>
                                </div>
                            );
                        })
                    ) : (
                        <div className="no-results">
                            No student records found for {selectedClass}.
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

export default ClassPerformancePage;
