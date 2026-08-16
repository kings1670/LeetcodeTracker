import { useState, useEffect, useMemo } from "react";
import { fetchActivityAnalysis, fetchLatestSubmissions, fetchProblemCache } from "../services/dashboardData";
import "./StudentDetailPage.css";
import {
    ResponsiveContainer,
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid
} from "recharts";

function StudentDetailPage({ student, dashboardData, previousTab, onBack }) {
    const [activityData, setActivityData] = useState(null);
    const [latestSubmissionsData, setLatestSubmissionsData] = useState(null);
    const [problemCacheData, setProblemCacheData] = useState(null);
    const [loading, setLoading] = useState(true);

    const rollNumber = student?.rollNumber || student?.id || "";
    const username = student?.leetcodeUsername || student?.username || "";
    const name = student?.name || "Student Profile";
    const department = student?.department || "CSD";

    useEffect(() => {
        let isMounted = true;
        setLoading(true);

        Promise.all([
            fetchActivityAnalysis(),
            fetchLatestSubmissions(),
            fetchProblemCache()
        ])
            .then(([actData, subData, cacheData]) => {
                if (isMounted) {
                    setActivityData(actData);
                    setLatestSubmissionsData(subData);
                    setProblemCacheData(cacheData);
                    setLoading(false);
                }
            })
            .catch((err) => {
                console.warn("[StudentDetail] Failed loading detailed supplementary data:", err);
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [rollNumber]);

    // 1. Calculate historical solving trend for this student from dailySnapshots
    const studentHistoryTrend = useMemo(() => {
        const snapshots = dashboardData?.dailySnapshots || {};
        const trend = [];

        Object.entries(snapshots)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .forEach(([dStr, snap]) => {
                const sRec = (snap.students || []).find(
                    (s) => s.rollNumber === rollNumber || s.id === rollNumber
                );
                if (sRec) {
                    trend.push({
                        date: dStr,
                        day: snap.dateFormatted || dStr.substring(5),
                        totalSolved: sRec.totalSolved,
                        improvement: sRec.improvement
                    });
                }
            });

        return trend;
    }, [dashboardData?.dailySnapshots, rollNumber]);

    // 2. Extract recent accepted submissions for this student
    const studentSubmissions = useMemo(() => {
        if (!latestSubmissionsData || !latestSubmissionsData.students) return [];
        const sEntry = latestSubmissionsData.students[rollNumber];
        if (!sEntry) return [];
        return sEntry.recentAcceptedSubmissions || [];
    }, [latestSubmissionsData, rollNumber]);

    // 3. Compute topic distribution for this student using problem cache
    const studentTopics = useMemo(() => {
        if (!studentSubmissions.length || !problemCacheData) return [];

        const topicCounts = {};
        const seenSlugs = new Set();

        studentSubmissions.forEach((sub) => {
            const slug = sub.titleSlug;
            if (!slug || seenSlugs.has(slug)) return;
            seenSlugs.add(slug);

            const qInfo = problemCacheData[slug] || {};
            const tags = qInfo.topicTags || [];
            tags.forEach((tag) => {
                topicCounts[tag] = (topicCounts[tag] || 0) + 1;
            });
        });

        const sorted = Object.entries(topicCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([topic, count]) => ({ topic, count }));

        const maxCount = sorted[0]?.count || 1;
        return sorted.map((t) => ({
            ...t,
            percentage: Math.round((t.count / maxCount) * 100)
        }));
    }, [studentSubmissions, problemCacheData]);

    // 4. Extract Activity Pattern record for this student from activity-analysis.json
    const studentActivityRecord = useMemo(() => {
        if (!activityData || !activityData.students) return null;
        return activityData.students[rollNumber] || null;
    }, [activityData, rollNumber]);

    // 5. Compute student's 24-hour clock distribution for Recharts
    const studentHourlyChartData = useMemo(() => {
        if (!studentActivityRecord || !studentActivityRecord.hourlyActivity) return [];
        const hourBins = Array(24).fill(0);

        Object.entries(studentActivityRecord.hourlyActivity).forEach(([slotStr, cnt]) => {
            const match = slotStr.match(/^(\d{2}):/);
            if (match) {
                const h = parseInt(match[1], 10);
                if (h >= 0 && h < 24) hourBins[h] += cnt;
            }
        });

        return hourBins.map((cnt, h) => ({
            hour: `${h.toString().padStart(2, "0")}:00`,
            submissions: cnt
        }));
    }, [studentActivityRecord]);

    // Helper for initials
    const getInitials = (nameStr) => {
        if (!nameStr) return "";
        const parts = nameStr.trim().split(" ");
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    // Label for back navigation
    const backLabel = useMemo(() => {
        if (previousTab === "students") return "Students Roster";
        if (previousTab === "analytics") return "Analytics";
        if (previousTab === "activity-patterns") return "Activity Patterns";
        if (previousTab === "class-performance") return "Class Performance";
        return "Dashboard";
    }, [previousTab]);

    const flags = studentActivityRecord?.activityFlags || [];
    const isNormal = studentActivityRecord?.activitySummary !== "Review Indicators Present";
    const disclaimerText = activityData?.disclaimer ||
        "These indicators describe observable submission activity patterns only. They do not establish whether the work was independently completed or whether any academic-integrity violation occurred.";

    return (
        <div className="student-detail-container">
            {/* Navigation & Header */}
            <div className="student-detail-top-bar">
                <button className="back-button" onClick={onBack}>
                    ← Back to {backLabel}
                </button>
                {username && (
                    <a
                        className="leetcode-profile-link"
                        href={`https://leetcode.com/u/${username}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        View LeetCode Profile ↗
                    </a>
                )}
            </div>

            {/* Student Profile Banner */}
            <section className="student-banner">
                <div className="banner-avatar">{getInitials(name)}</div>
                <div className="banner-info">
                    <div className="banner-title-row">
                        <h2>{name}</h2>
                        <span className={`status-badge ${student?.status === "Active" ? "status-active" : "status-inactive"}`}>
                            {student?.status || "Active"}
                        </span>
                    </div>
                    <div className="banner-meta-row">
                        <span>Roll Number: <strong>{rollNumber}</strong></span>
                        <span>Username: <strong>@{username || "N/A"}</strong></span>
                        <span>Department: <strong>{department}</strong></span>
                        {student?.rank && <span>Rank: <strong>#{student.rank}</strong></span>}
                    </div>
                </div>
            </section>

            {/* Stat Cards Grid */}
            <section className="detail-stats-grid">
                <div className="detail-stat-card">
                    <div className="stat-icon icon-blue">✓</div>
                    <div>
                        <p>Total Solved</p>
                        <h3>{student?.totalSolved || 0}</h3>
                        <span className="subtext">Combined problems</span>
                    </div>
                </div>

                <div className="detail-stat-card">
                    <div className="stat-icon icon-emerald">E</div>
                    <div>
                        <p>Easy</p>
                        <h3>{student?.easy || 0}</h3>
                        <span className="subtext-positive">Easy solved</span>
                    </div>
                </div>

                <div className="detail-stat-card">
                    <div className="stat-icon icon-amber">M</div>
                    <div>
                        <p>Medium</p>
                        <h3>{student?.medium || 0}</h3>
                        <span className="subtext-amber">Medium solved</span>
                    </div>
                </div>

                <div className="detail-stat-card">
                    <div className="stat-icon icon-rose">H</div>
                    <div>
                        <p>Hard</p>
                        <h3>{student?.hard || 0}</h3>
                        <span className="subtext-danger">Hard solved</span>
                    </div>
                </div>

                <div className="detail-stat-card">
                    <div className="stat-icon icon-purple">⚡</div>
                    <div>
                        <p>Solved Today</p>
                        <h3>+{student?.improvement || 0}</h3>
                        <span className="subtext">Today's snapshot</span>
                    </div>
                </div>

                <div className="detail-stat-card">
                    <div className="stat-icon icon-cyan">🔥</div>
                    <div>
                        <p>Current Streak</p>
                        <h3>{student?.streak || 0} days</h3>
                        <span className="subtext-positive">Active daily streak</span>
                    </div>
                </div>

                <div className="detail-stat-card">
                    <div className="stat-icon icon-blue">⏳</div>
                    <div>
                        <p>Last Active</p>
                        <h3>{student?.lastActive || "Today"}</h3>
                        <span className="subtext">Last recorded progress</span>
                    </div>
                </div>
            </section>

            {/* Performance Trend Chart */}
            <section className="detail-panel">
                <div className="panel-header">
                    <div>
                        <h3>Solving Progress History</h3>
                        <p>Historical total solved problems across recorded snapshots</p>
                    </div>
                </div>

                <div className="chart-wrapper" style={{ height: 230 }}>
                    {studentHistoryTrend.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={studentHistoryTrend} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                                <YAxis allowDecimals={false} stroke="#94a3b8" fontSize={11} />
                                <Tooltip
                                    formatter={(value) => [`${value} problems`, "Total Solved"]}
                                    contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "8px", color: "#f8fafc" }}
                                />
                                <Line type="monotone" dataKey="totalSolved" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="no-data-msg">Limited historical trend data available for this student.</p>
                    )}
                </div>
            </section>

            {/* Grid 2: Topic Analysis & Activity Clock */}
            <section className="detail-grid-two">
                {/* Topic Analysis */}
                <div className="detail-panel">
                    <div className="panel-header">
                        <div>
                            <h3>Solved Problem Topics</h3>
                            <p>Top problem tags from student's accepted solutions</p>
                        </div>
                    </div>

                    <div className="topics-list">
                        {studentTopics.length > 0 ? (
                            studentTopics.slice(0, 6).map((t, idx) => (
                                <div key={idx} className="topic-row">
                                    <div className="topic-info">
                                        <span className="topic-name">#{idx + 1} {t.topic}</span>
                                        <strong>{t.count} solved</strong>
                                    </div>
                                    <div className="topic-bar-bg">
                                        <div className="topic-bar-fill" style={{ width: `${t.percentage}%` }}></div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="no-data-msg">Student-level topic analytics are not available in the current dataset.</p>
                        )}
                    </div>
                </div>

                {/* Observed Hourly Clock Pattern */}
                <div className="detail-panel">
                    <div className="panel-header">
                        <div>
                            <h3>24-Hour Submission Clock Pattern</h3>
                            <p>Accepted submission distribution by hour of day (IST)</p>
                        </div>
                    </div>

                    <div className="chart-wrapper" style={{ height: 210 }}>
                        {studentHourlyChartData.some((d) => d.submissions > 0) ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={studentHourlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
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
                        ) : (
                            <p className="no-data-msg">No hourly activity distribution available for this student.</p>
                        )}
                    </div>
                </div>
            </section>

            {/* Recent Accepted Submissions Table */}
            <section className="detail-panel full-panel">
                <div className="panel-header-with-badge">
                    <div>
                        <h3>Recent Accepted Submissions</h3>
                        <p>Accepted solutions retrieved from public LeetCode GraphQL endpoint</p>
                    </div>
                    <span className="count-badge">{studentSubmissions.length} Recent Submissions</span>
                </div>

                <div className="table-responsive">
                    <table className="submissions-table">
                        <thead>
                            <tr>
                                <th>Date (IST)</th>
                                <th>Time (IST)</th>
                                <th>Problem Title</th>
                                <th>Difficulty</th>
                                <th>Language</th>
                                <th>Topic Tags</th>
                            </tr>
                        </thead>
                        <tbody>
                            {studentSubmissions.length > 0 ? (
                                studentSubmissions.map((sub, idx) => {
                                    const slug = sub.titleSlug;
                                    const qInfo = (problemCacheData && problemCacheData[slug]) || {};
                                    const diff = qInfo.difficulty || "Unknown";
                                    const tags = qInfo.topicTags || [];

                                    const diffClass =
                                        diff === "Easy"
                                            ? "diff-easy"
                                            : diff === "Medium"
                                            ? "diff-medium"
                                            : diff === "Hard"
                                            ? "diff-hard"
                                            : "diff-unknown";

                                    return (
                                        <tr key={sub.id || idx}>
                                            <td className="code-text">{sub.date || "N/A"}</td>
                                            <td className="code-text">{sub.time || "N/A"}</td>
                                            <td>
                                                <a
                                                    className="problem-link"
                                                    href={`https://leetcode.com/problems/${slug}/`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    {sub.title} ↗
                                                </a>
                                            </td>
                                            <td>
                                                <span className={`diff-tag ${diffClass}`}>{diff}</span>
                                            </td>
                                            <td>
                                                <span className="lang-tag">{sub.language || "N/A"}</span>
                                            </td>
                                            <td>
                                                <div className="tag-pills">
                                                    {tags.length > 0 ? (
                                                        tags.slice(0, 3).map((t, tIdx) => (
                                                            <span key={tIdx} className="tag-pill">{t}</span>
                                                        ))
                                                    ) : (
                                                        <span className="no-tag">-</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="6" className="no-data-msg">
                                        No recent accepted submission records available.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <p className="table-footnote">
                    * Showing up to 20 recent accepted submissions retrieved from public LeetCode GraphQL API.
                </p>
            </section>

            {/* Observable Activity Pattern Review */}
            <section className="detail-panel full-panel">
                <div className="panel-header">
                    <div>
                        <h3>Observable Activity Pattern Review</h3>
                        <p>Summary of observable timing indicators from Phase 4 pattern analysis</p>
                    </div>
                </div>

                <div className="activity-review-content">
                    <div className="status-indicator-box">
                        <span className="label">Activity Summary:</span>
                        <strong className={isNormal ? "text-emerald" : "text-amber"}>
                            {studentActivityRecord?.activitySummary || "Normal Activity"}
                        </strong>
                    </div>

                    {flags.length > 0 ? (
                        <div className="flags-detail-list">
                            {flags.map((f, idx) => (
                                <div key={idx} className={`flag-card level-border-${f.level}`}>
                                    <div className="flag-card-header">
                                        <span className={`flag-pill level-${f.level}`}>{f.indicator}</span>
                                        {f.requiresReview && <span className="review-badge">Requires Academic Review</span>}
                                    </div>
                                    <p className="flag-description">{f.description}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="normal-activity-msg">
                            ✓ No observable activity pattern indicators triggered for this student profile.
                        </p>
                    )}

                    <div className="disclaimer-footer">
                        <span>ℹ️</span>
                        <p>{disclaimerText}</p>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default StudentDetailPage;
