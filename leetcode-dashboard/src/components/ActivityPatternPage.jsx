import { useState, useEffect, useMemo } from "react";
import { fetchActivityAnalysis } from "../services/dashboardData";
import "./ActivityPatternPage.css";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    Cell,
    CartesianGrid
} from "recharts";

function ActivityPatternPage({ dashboardData, onSelectStudent }) {
    const [activityData, setActivityData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [indicatorFilter, setIndicatorFilter] = useState("all");
    const [selectedStudent, setSelectedStudent] = useState(null);

    useEffect(() => {
        let isMounted = true;
        fetchActivityAnalysis()
            .then((data) => {
                if (isMounted) {
                    setActivityData(data);
                    setLoading(false);
                }
            })
            .catch((err) => {
                console.error("Failed to load activity analysis data:", err);
                if (isMounted) setLoading(false);
            });
        return () => {
            isMounted = false;
        };
    }, []);

    const summary = activityData?.summary || {};
    const indicatorBreakdown = summary.indicatorBreakdown || {};
    const disclaimerText = activityData?.disclaimer ||
        "These indicators describe observable submission activity patterns only. They do not establish whether the work was independently completed or whether any academic-integrity violation occurred.";

    const studentsMap = activityData?.students || {};
    const studentsList = useMemo(() => Object.values(studentsMap), [studentsMap]);

    // 1. Indicator breakdown chart data for Recharts
    const indicatorChartData = useMemo(() => {
        return [
            { name: "Sudden Burst", fullName: "Sudden Activity Burst", count: indicatorBreakdown["Sudden Activity Burst"] || 0, color: "#f59e0b" },
            { name: "Same-Time", fullName: "Repeated Same-Time Pattern", count: indicatorBreakdown["Repeated Same-Time Pattern"] || 0, color: "#eab308" },
            { name: "Gap + Burst", fullName: "Large Gap Followed by Burst", count: indicatorBreakdown["Large Gap Followed by Burst"] || 0, color: "#f97316" },
            { name: "Very High Daily", fullName: "Very High Daily Activity", count: indicatorBreakdown["Very High Daily Activity"] || 0, color: "#ef4444" },
            { name: "Difficulty Jump", fullName: "Unusual Difficulty Jump", count: indicatorBreakdown["Unusual Difficulty Jump"] || 0, color: "#8b5cf6" }
        ];
    }, [indicatorBreakdown]);

    // 2. Daily overall activity trend aggregated across all students
    const dailyActivityTrend = useMemo(() => {
        const dateCounts = {};
        studentsList.forEach((s) => {
            const daily = s.dailyActivity || {};
            Object.entries(daily).forEach(([dStr, cnt]) => {
                dateCounts[dStr] = (dateCounts[dStr] || 0) + cnt;
            });
        });

        return Object.entries(dateCounts)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([dStr, cnt]) => ({
                date: dStr,
                formattedDate: dStr.substring(5),
                submissions: cnt
            }));
    }, [studentsList]);

    // 3. Hourly overall activity breakdown (24-hour slots)
    const hourly24Distribution = useMemo(() => {
        const hourBins = Array(24).fill(0);
        studentsList.forEach((s) => {
            const hourly = s.hourlyActivity || {};
            Object.entries(hourly).forEach(([slotStr, cnt]) => {
                // slotStr formats like "09:00-09:59" or "09:00" or similar
                const match = slotStr.match(/^(\d{2}):/);
                if (match) {
                    const h = parseInt(match[1], 10);
                    if (h >= 0 && h < 24) {
                        hourBins[h] += cnt;
                    }
                }
            });
        });

        return hourBins.map((cnt, h) => ({
            hour: `${h.toString().padStart(2, "0")}:00`,
            submissions: cnt
        }));
    }, [studentsList]);

    // 4. Filtered student review table list
    const filteredStudents = useMemo(() => {
        return studentsList
            .filter((student) => {
                // Search query matching Name, Roll Number, Username
                const query = searchTerm.toLowerCase().trim();
                const matchesSearch =
                    !query ||
                    (student.name && student.name.toLowerCase().includes(query)) ||
                    (student.rollNumber && student.rollNumber.toLowerCase().includes(query)) ||
                    (student.username && student.username.toLowerCase().includes(query));

                // Indicator filter
                let matchesFilter = true;
                if (indicatorFilter === "normal") {
                    matchesFilter = student.activitySummary === "Normal Activity";
                } else if (indicatorFilter === "flagged") {
                    matchesFilter = student.activitySummary === "Review Indicators Present";
                } else if (indicatorFilter !== "all") {
                    matchesFilter = (student.activityFlags || []).some(
                        (f) => f.indicator === indicatorFilter
                    );
                }

                return matchesSearch && matchesFilter;
            })
            .sort((a, b) => {
                const lenA = (a.activityFlags || []).length;
                const lenB = (b.activityFlags || []).length;
                return lenB - lenA; // Prioritize students with flags
            });
    }, [studentsList, searchTerm, indicatorFilter]);

    // Helper for student initials
    const getInitials = (name) => {
        if (!name) return "";
        const parts = name.trim().split(" ");
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    if (loading) {
        return (
            <div className="activity-loading-state">
                <div className="spinner"></div>
                <p>Loading Activity Pattern Analytics...</p>
            </div>
        );
    }

    if (!activityData) {
        return (
            <div className="activity-error-state">
                <div className="error-icon">⚠️</div>
                <h3>Activity pattern data is currently unavailable</h3>
                <p>Please ensure collect_submissions.py and analyze_activity.py have been executed.</p>
            </div>
        );
    }

    return (
        <div className="activity-container">
            {/* Header */}
            <header className="activity-header">
                <div>
                    <h1>Activity Pattern Analytics</h1>
                    <p>Observable Submission Timing & Activity Pattern Intelligence</p>
                </div>
            </header>

            {/* Academic Disclaimer Banner */}
            <div className="disclaimer-banner">
                <div className="disclaimer-icon">ℹ️</div>
                <div className="disclaimer-text">
                    <strong>Academic Disclaimer:</strong> {disclaimerText}
                </div>
            </div>

            {/* Summary Cards */}
            <section className="activity-summary-grid">
                <div className="activity-card">
                    <div className="activity-card-icon icon-blue">👨‍🎓</div>
                    <div className="activity-card-info">
                        <p>Total Students Analyzed</p>
                        <h3>{summary.totalStudentsAnalyzed || 0}</h3>
                        <span className="subtext">Registered LeetCode accounts</span>
                    </div>
                </div>

                <div className="activity-card">
                    <div className="activity-card-icon icon-purple">⚡</div>
                    <div className="activity-card-info">
                        <p>Total Submission Events</p>
                        <h3>{(summary.totalSubmissionEventsAnalyzed || 0).toLocaleString()}</h3>
                        <span className="subtext">Accepted submission events</span>
                    </div>
                </div>

                <div className="activity-card">
                    <div className="activity-card-icon icon-emerald">✓</div>
                    <div className="activity-card-info">
                        <p>Normal Activity</p>
                        <h3>{summary.normalActivityStudents || 0}</h3>
                        <span className="subtext-positive">No review indicators triggered</span>
                    </div>
                </div>

                <div className="activity-card">
                    <div className="activity-card-icon icon-amber">🔍</div>
                    <div className="activity-card-info">
                        <p>Review Indicators</p>
                        <h3>{summary.studentsWithReviewFlags || 0}</h3>
                        <span className="subtext-amber">Students with activity indicators</span>
                    </div>
                </div>
            </section>

            {/* Charts Grid: Indicator Breakdown & 24-Hour Distribution */}
            <section className="activity-charts-grid">
                {/* Indicator Breakdown Panel */}
                <div className="activity-panel">
                    <div className="panel-header">
                        <div>
                            <h3>Activity Indicator Breakdown</h3>
                            <p>Distribution of triggered observable review indicators</p>
                        </div>
                    </div>

                    <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={indicatorChartData} margin={{ top: 15, right: 15, left: -15, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                                <YAxis allowDecimals={false} stroke="#94a3b8" fontSize={11} />
                                <Tooltip
                                    formatter={(value, name, item) => [`${value} indicators`, item.payload.fullName]}
                                    contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "8px", color: "#f8fafc" }}
                                />
                                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                                    {indicatorChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="indicator-pills-legend">
                        {indicatorChartData.map((ind, idx) => (
                            <div key={idx} className="ind-pill">
                                <span className="ind-dot" style={{ backgroundColor: ind.color }}></span>
                                <span className="ind-name">{ind.fullName}:</span>
                                <strong>{ind.count}</strong>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 24-Hour Clock Submission Cluster */}
                <div className="activity-panel">
                    <div className="panel-header">
                        <div>
                            <h3>24-Hour Submission Clock Pattern</h3>
                            <p>Distribution of accepted submissions by hour of day (IST)</p>
                        </div>
                    </div>

                    <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={hourly24Distribution} margin={{ top: 15, right: 10, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                                <XAxis dataKey="hour" stroke="#94a3b8" fontSize={10} interval={2} />
                                <YAxis allowDecimals={false} stroke="#94a3b8" fontSize={11} />
                                <Tooltip
                                    formatter={(value) => [`${value} submissions`, "Accepted"]}
                                    contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "8px", color: "#f8fafc" }}
                                />
                                <Bar dataKey="submissions" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <p className="chart-footnote">
                        Identifies peak solving windows and same-time submission clusters across clock hours.
                    </p>
                </div>
            </section>

            {/* Daily Submission Activity Timeline */}
            <section className="activity-panel full-panel">
                <div className="panel-header">
                    <div>
                        <h3>Daily Submission Activity Timeline</h3>
                        <p>Total accepted submission events per calendar day across all students</p>
                    </div>
                </div>

                <div className="chart-wrapper" style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dailyActivityTrend} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                            <XAxis dataKey="formattedDate" stroke="#94a3b8" fontSize={11} />
                            <YAxis allowDecimals={false} stroke="#94a3b8" fontSize={11} />
                            <Tooltip
                                formatter={(value) => [`${value} submissions`, "Accepted Total"]}
                                contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "8px", color: "#f8fafc" }}
                            />
                            <Line type="monotone" dataKey="submissions" stroke="#a855f7" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </section>

            {/* Student Activity Review Roster */}
            <section className="activity-panel full-panel">
                <div className="panel-header-with-actions">
                    <div>
                        <h3>Student Activity Pattern Roster</h3>
                        <p>Review observable indicators and submission patterns</p>
                    </div>

                    <div className="controls-group">
                        <div className="search-box">
                            <span className="search-icon">🔍</span>
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Search student name, roll number, or username..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <select
                            className="filter-select"
                            value={indicatorFilter}
                            onChange={(e) => setIndicatorFilter(e.target.value)}
                        >
                            <option value="all">All Students ({studentsList.length})</option>
                            <option value="normal">Normal Activity ({summary.normalActivityStudents})</option>
                            <option value="flagged">Review Indicators Present ({summary.studentsWithReviewFlags})</option>
                            <option value="Sudden Activity Burst">Sudden Activity Burst ({indicatorBreakdown["Sudden Activity Burst"] || 0})</option>
                            <option value="Repeated Same-Time Pattern">Repeated Same-Time Pattern ({indicatorBreakdown["Repeated Same-Time Pattern"] || 0})</option>
                            <option value="Large Gap Followed by Burst">Large Gap Followed by Burst ({indicatorBreakdown["Large Gap Followed by Burst"] || 0})</option>
                            <option value="Very High Daily Activity">Very High Daily Activity ({indicatorBreakdown["Very High Daily Activity"] || 0})</option>
                            <option value="Unusual Difficulty Jump">Unusual Difficulty Jump ({indicatorBreakdown["Unusual Difficulty Jump"] || 0})</option>
                        </select>
                    </div>
                </div>

                <div className="table-responsive">
                    <table className="activity-table">
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Roll Number</th>
                                <th>LeetCode Username</th>
                                <th>Activity Summary</th>
                                <th>Review Indicators</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.length > 0 ? (
                                filteredStudents.map((student, idx) => {
                                    const flags = student.activityFlags || [];
                                    const isNormal = student.activitySummary === "Normal Activity";

                                    return (
                                        <tr
                                            key={student.rollNumber || idx}
                                            className="student-row"
                                            onClick={() => {
                                                if (onSelectStudent) {
                                                    onSelectStudent(student);
                                                } else {
                                                    setSelectedStudent(student);
                                                }
                                            }}
                                        >
                                            <td>
                                                <div className="student-info-cell">
                                                    <div className="student-avatar">{getInitials(student.name)}</div>
                                                    <span className="name">{student.name}</span>
                                                </div>
                                            </td>
                                            <td className="code-text">{student.rollNumber}</td>
                                            <td className="leetcode-text">@{student.username}</td>
                                            <td>
                                                <span className={`status-badge ${isNormal ? "status-normal" : "status-review"}`}>
                                                    {student.activitySummary}
                                                </span>
                                            </td>
                                            <td>
                                                {flags.length > 0 ? (
                                                    <div className="flags-list">
                                                        {flags.map((f, fIdx) => (
                                                            <span key={fIdx} className={`flag-badge level-${f.level}`}>
                                                                {f.indicator}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="no-flags-text">No active indicators</span>
                                                )}
                                            </td>
                                            <td>
                                                <button
                                                    className="details-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (onSelectStudent) {
                                                            onSelectStudent(student);
                                                        } else {
                                                            setSelectedStudent(student);
                                                        }
                                                    }}
                                                >
                                                    View Profile →
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="6" className="no-results-cell">
                                        No students found matching your search and filter criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Student Observed Activity Details Modal */}
            {selectedStudent && (
                <div className="modal-overlay" onClick={() => setSelectedStudent(null)}>
                    <div className="modal-content activity-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h2>Observed Activity Details</h2>
                                <p>{selectedStudent.name} ({selectedStudent.rollNumber})</p>
                            </div>
                            <button className="modal-close" onClick={() => setSelectedStudent(null)}>✕</button>
                        </div>

                        <div className="modal-body">
                            <div className="modal-info-grid">
                                <div className="info-box">
                                    <span>LeetCode Username:</span>
                                    <strong>@{selectedStudent.username}</strong>
                                </div>
                                <div className="info-box">
                                    <span>Activity Summary:</span>
                                    <strong className={selectedStudent.activitySummary === "Normal Activity" ? "text-emerald" : "text-amber"}>
                                        {selectedStudent.activitySummary}
                                    </strong>
                                </div>
                            </div>

                            {/* Flags breakdown */}
                            <div className="modal-section">
                                <h4>Triggered Indicators</h4>
                                {(selectedStudent.activityFlags || []).length > 0 ? (
                                    <div className="modal-flags-list">
                                        {selectedStudent.activityFlags.map((f, idx) => (
                                            <div key={idx} className={`flag-detail-card level-border-${f.level}`}>
                                                <div className="flag-title">
                                                    <span className={`badge level-${f.level}`}>{f.indicator}</span>
                                                    {f.requiresReview && <span className="review-tag">Requires Academic Review</span>}
                                                </div>
                                                <p className="flag-desc">{f.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="modal-normal-msg">✓ No observable activity indicators triggered for this student.</p>
                                )}
                            </div>

                            {/* Observed Daily Activity */}
                            <div className="modal-section">
                                <h4>Observed Daily Activity</h4>
                                <div className="daily-activity-list">
                                    {Object.entries(selectedStudent.dailyActivity || {}).length > 0 ? (
                                        Object.entries(selectedStudent.dailyActivity).map(([dStr, cnt], idx) => (
                                            <div key={idx} className="daily-item">
                                                <span className="d-date">{dStr}:</span>
                                                <strong className="d-count">{cnt} accepted problems</strong>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="no-data-text">No daily submission records available.</p>
                                    )}
                                </div>
                            </div>

                            {/* Observed Hourly Activity */}
                            <div className="modal-section">
                                <h4>Observed Hourly Distribution</h4>
                                <div className="hourly-activity-list">
                                    {Object.entries(selectedStudent.hourlyActivity || {}).length > 0 ? (
                                        Object.entries(selectedStudent.hourlyActivity).map(([hSlot, cnt], idx) => (
                                            <div key={idx} className="hourly-item">
                                                <span className="h-slot">{hSlot}:</span>
                                                <span className="h-cnt">{cnt} subs</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="no-data-text">No hourly distribution data available.</p>
                                    )}
                                </div>
                            </div>

                            {/* Modal Disclaimer */}
                            <div className="modal-disclaimer">
                                <span>ℹ️</span>
                                <p>{disclaimerText}</p>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="modal-close-btn" onClick={() => setSelectedStudent(null)}>
                                Close Activity Details
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ActivityPatternPage;
