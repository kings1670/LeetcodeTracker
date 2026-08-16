import { useState, useMemo } from "react";
import "./AnalyticsPage.css";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Cell,
    CartesianGrid,
    PieChart,
    Pie
} from "recharts";

function AnalyticsPage({ data, onNavigateToTab, onSelectStudent }) {
    const [inactivityFilter, setInactivityFilter] = useState("all");
    const [selectedClass, setSelectedClass] = useState("All Classes");
    const [matrixSearch, setMatrixSearch] = useState("");
    const [matrixSortBy, setMatrixSortBy] = useState("total");
    const [matrixSortOrder, setMatrixSortOrder] = useState("desc");

    // Safe extraction of Phase 3 data structures
    const summary = data?.summary || {};
    const weeklyImp = data?.weeklyImprovement || {};
    const distribution = data?.studentDistribution || {};
    const yesterdayTop = data?.yesterdayTopStudents || [];
    const weeklyTop = data?.weeklyTopStudents || [];
    const inactiveStudents = data?.inactiveStudents || [];
    const topicsAnalysis = data?.topicsAnalysis || {};
    const difficultyAnalysis = data?.difficultyAnalysis || {};
    const submissionAnalytics = data?.submissionAnalytics || {};

    const totalStudents = summary.totalStudents || 0;
    const activeStudents = summary.activeStudents || 0;
    const inactiveCount = summary.inactiveStudents || 0;
    const neverActiveCount = summary.neverActiveStudents || 0;
    const totalInactive = inactiveCount + neverActiveCount;

    const studentsImproved = weeklyImp.studentsImproved ?? 0;
    const weeklyProblemsSolved = weeklyImp.problemsSolved ?? (summary.weeklyImprovement || 0);

    // Distribution data for Recharts Bar Chart
    const distributionChartData = useMemo(() => {
        const p = distribution.percentages || {};
        return [
            { label: "0 Solved", category: "0 Problems", count: distribution.solved0 || 0, percentage: p.solved0 || 0, color: "#ef4444" },
            { label: "1 Solved", category: "1 Problem", count: distribution.solved1 || 0, percentage: p.solved1 || 0, color: "#f59e0b" },
            { label: "2 Solved", category: "2 Problems", count: distribution.solved2 || 0, percentage: p.solved2 || 0, color: "#3b82f6" },
            { label: "3+ Solved", category: "3+ Problems", count: distribution.solved3plus || 0, percentage: p.solved3plus || 0, color: "#10b981" }
        ];
    }, [distribution]);

    // Feature 1: Top 10 Topics Overall Data for Horizontal BarChart
    const top10TopicsData = useMemo(() => {
        const list = topicsAnalysis.overall || [];
        return list.slice(0, 10).map((t) => ({
            topic: t.topic,
            count: t.count
        }));
    }, [topicsAnalysis.overall]);

    // Feature 2: Difficulty Analytics (Easy, Medium, Hard) counts & percentages
    const difficultyStats = useMemo(() => {
        const easy = difficultyAnalysis.Easy || 0;
        const medium = difficultyAnalysis.Medium || 0;
        const hard = difficultyAnalysis.Hard || 0;
        const total = easy + medium + hard || 1;

        return {
            easy,
            medium,
            hard,
            total,
            easyPct: Math.round((easy / total) * 100),
            mediumPct: Math.round((medium / total) * 100),
            hardPct: Math.round((hard / total) * 100),
            chartData: [
                { name: "Easy", value: easy, color: "#10b981" },
                { name: "Medium", value: medium, color: "#f59e0b" },
                { name: "Hard", value: hard, color: "#ef4444" }
            ]
        };
    }, [difficultyAnalysis]);

    // Feature 3: Class-wise Topic List
    const availableClasses = useMemo(() => {
        const classKeys = Object.keys(topicsAnalysis.byClass || {});
        if (classKeys.length > 0) {
            return ["All Classes", ...classKeys];
        }
        return data?.classes ? ["All Classes", ...data.classes] : ["All Classes"];
    }, [topicsAnalysis.byClass, data?.classes]);

    const selectedClassTopics = useMemo(() => {
        if (selectedClass === "All Classes" || !topicsAnalysis.byClass?.[selectedClass]) {
            return (topicsAnalysis.overall || []).slice(0, 8);
        }
        return (topicsAnalysis.byClass[selectedClass] || []).slice(0, 8);
    }, [topicsAnalysis, selectedClass]);

    // Feature 4: Topic x Difficulty Matrix Table Data
    const topicDifficultyMatrix = useMemo(() => {
        const byTopic = difficultyAnalysis.byTopic || {};
        const rows = [];

        Object.entries(byTopic).forEach(([topic, diffs]) => {
            const easy = diffs.Easy || 0;
            const medium = diffs.Medium || 0;
            const hard = diffs.Hard || 0;
            const total = easy + medium + hard;
            rows.push({ topic, easy, medium, hard, total });
        });

        // Fallback to topicsAnalysis.overall if byTopic empty
        if (rows.length === 0 && topicsAnalysis.overall) {
            topicsAnalysis.overall.forEach((t) => {
                rows.push({ topic: t.topic, easy: 0, medium: 0, hard: 0, total: t.count });
            });
        }

        return rows
            .filter((row) => !matrixSearch || row.topic.toLowerCase().includes(matrixSearch.toLowerCase().trim()))
            .sort((a, b) => {
                let valA = a[matrixSortBy];
                let valB = b[matrixSortBy];

                if (typeof valA === "string") {
                    valA = (valA || "").toLowerCase();
                    valB = (valB || "").toLowerCase();
                    return matrixSortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
                }

                valA = valA || 0;
                valB = valB || 0;
                return matrixSortOrder === "asc" ? valA - valB : valB - valA;
            });
    }, [difficultyAnalysis.byTopic, topicsAnalysis.overall, matrixSearch, matrixSortBy, matrixSortOrder]);

    const handleMatrixSort = (field) => {
        if (matrixSortBy === field) {
            setMatrixSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
        } else {
            setMatrixSortBy(field);
            setMatrixSortOrder("desc");
        }
    };

    // Filter inactive students list
    const filteredInactiveStudents = useMemo(() => {
        return inactiveStudents.filter((student) => {
            if (inactivityFilter === "recent") return student.inactivityType === "INACTIVE_RECENT";
            if (inactivityFilter === "longterm") return student.inactivityType === "INACTIVE_LONG_TERM";
            if (inactivityFilter === "never") return student.inactivityType === "NEVER_ACTIVE";
            return true; // "all"
        });
    }, [inactiveStudents, inactivityFilter]);

    // Helper for student initials avatar
    const getInitials = (name) => {
        if (!name) return "";
        const parts = name.trim().split(" ");
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    // Helper for inactivity badge class
    const getInactivityBadge = (type) => {
        if (type === "NEVER_ACTIVE") {
            return { text: "Never Active", className: "badge-never" };
        } else if (type === "INACTIVE_LONG_TERM") {
            return { text: "Long-Term Inactive (15d+)", className: "badge-longterm" };
        } else if (type === "INACTIVE_RECENT") {
            return { text: "Recent Inactive (7-14d)", className: "badge-recent" };
        }
        return { text: "Inactive", className: "badge-default" };
    };

    return (
        <div className="analytics-container">
            {/* Page Header */}
            <header className="analytics-header">
                <div>
                    <h1>Analytics</h1>
                    <p>CSD Performance, Topic & Difficulty Intelligence</p>
                </div>
                {submissionAnalytics.latestCollectionDate && (
                    <div className="analytics-meta-badge">
                        <span>Data Freshness:</span>
                        <strong>{submissionAnalytics.latestCollectionDate}</strong>
                    </div>
                )}
            </header>

            {/* Section 1: Overview Cards */}
            <section className="analytics-overview-grid">
                <div className="analytics-card">
                    <div className="analytics-card-icon icon-blue">👨‍🎓</div>
                    <div className="analytics-card-content">
                        <p>Total Students</p>
                        <h3>{totalStudents}</h3>
                        <span className="subtext">{activeStudents} Active ({totalInactive} Inactive)</span>
                    </div>
                </div>

                <div className="analytics-card">
                    <div className="analytics-card-icon icon-emerald">⚡</div>
                    <div className="analytics-card-content">
                        <p>Active Students</p>
                        <h3>{activeStudents}</h3>
                        <span className="subtext-positive">Solving within last 7 days</span>
                    </div>
                </div>

                <div className="analytics-card">
                    <div className="analytics-card-icon icon-amber">⏳</div>
                    <div className="analytics-card-content">
                        <p>Inactive Students</p>
                        <h3>{inactiveCount}</h3>
                        <span className="subtext-amber">7+ days without activity</span>
                    </div>
                </div>

                <div className="analytics-card">
                    <div className="analytics-card-icon icon-rose">🛑</div>
                    <div className="analytics-card-content">
                        <p>Never Active</p>
                        <h3>{neverActiveCount}</h3>
                        <span className="subtext-danger">0 solved in history</span>
                    </div>
                </div>

                <div className="analytics-card">
                    <div className="analytics-card-icon icon-purple">🚀</div>
                    <div className="analytics-card-content">
                        <p>Students Improved</p>
                        <h3>{studentsImproved}</h3>
                        <span className="subtext-positive">Increased count this week</span>
                    </div>
                </div>

                <div className="analytics-card">
                    <div className="analytics-card-icon icon-cyan">📈</div>
                    <div className="analytics-card-content">
                        <p>Weekly Solved Total</p>
                        <h3>+{weeklyProblemsSolved}</h3>
                        <span className="subtext-positive">Problems solved this week</span>
                    </div>
                </div>
            </section>

            {/* Section 2: Feature 1 & Feature 2 — Topic & Difficulty Analytics */}
            <section className="analytics-grid-two">
                {/* Feature 1: Top 10 Topics Overall Horizontal Bar Chart */}
                <div className="analytics-panel">
                    <div className="panel-header">
                        <div>
                            <h3>Top 10 Problem Topics Overall</h3>
                            <p>Most frequently solved problem tags across all student submissions</p>
                        </div>
                    </div>

                    <div className="distribution-chart-wrapper" style={{ height: 260 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                layout="vertical"
                                data={top10TopicsData}
                                margin={{ top: 10, right: 20, left: 40, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.08)" />
                                <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                                <YAxis type="category" dataKey="topic" stroke="#94a3b8" fontSize={11} width={80} />
                                <Tooltip
                                    formatter={(value) => [`${value} problems`, "Solved"]}
                                    contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "8px", color: "#f8fafc" }}
                                />
                                <Bar dataKey="count" fill="#3b82f6" radius={[0, 6, 6, 0]}>
                                    {top10TopicsData.map((entry, idx) => (
                                        <Cell key={`topic-cell-${idx}`} fill={idx < 3 ? "#3b82f6" : "#6366f1"} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Feature 2: Difficulty Analytics (Donut Chart & Stats) */}
                <div className="analytics-panel">
                    <div className="panel-header">
                        <div>
                            <h3>Difficulty Analytics</h3>
                            <p>Distribution across Easy, Medium, and Hard problems</p>
                        </div>
                    </div>

                    <div className="difficulty-analytics-wrapper">
                        <div className="donut-wrapper">
                            <ResponsiveContainer width="100%" height={180}>
                                <PieChart>
                                    <Pie
                                        data={difficultyStats.chartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={75}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {difficultyStats.chartData.map((entry, index) => (
                                            <Cell key={`diff-cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value, name) => [`${value} problems`, name]}
                                        contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "8px", color: "#f8fafc" }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="donut-center-label">
                                <strong>{difficultyStats.total}</strong>
                                <span>Unique</span>
                            </div>
                        </div>

                        <div className="difficulty-cards-row">
                            <div className="diff-card easy-card">
                                <span className="label">Easy</span>
                                <h3>{difficultyStats.easy}</h3>
                                <span className="pct">{difficultyStats.easyPct}% of total</span>
                            </div>
                            <div className="diff-card medium-card">
                                <span className="label">Medium</span>
                                <h3>{difficultyStats.medium}</h3>
                                <span className="pct">{difficultyStats.mediumPct}% of total</span>
                            </div>
                            <div className="diff-card hard-card">
                                <span className="label">Hard</span>
                                <h3>{difficultyStats.hard}</h3>
                                <span className="pct">{difficultyStats.hardPct}% of total</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Section 3: Feature 3 & Activity Distribution */}
            <section className="analytics-grid-two">
                {/* Feature 3: Class-Wise Topic Analysis */}
                <div className="analytics-panel">
                    <div className="panel-header-with-actions">
                        <div>
                            <h3>Class-Wise Topic Analysis</h3>
                            <p>Top problem topics filtered by department/class</p>
                        </div>

                        <select
                            className="class-selector-dropdown"
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                        >
                            {availableClasses.map((cName, idx) => (
                                <option key={idx} value={cName}>
                                    {cName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="topics-list">
                        {selectedClassTopics.length > 0 ? (
                            selectedClassTopics.map((t, idx) => {
                                const maxCount = selectedClassTopics[0]?.count || 1;
                                const pct = Math.round((t.count / maxCount) * 100);
                                return (
                                    <div key={idx} className="topic-row">
                                        <div className="topic-info">
                                            <span className="topic-name">#{idx + 1} {t.topic}</span>
                                            <strong>{t.count} solved</strong>
                                        </div>
                                        <div className="topic-bar-bg">
                                            <div
                                                className="topic-bar-fill"
                                                style={{
                                                    width: `${pct}%`,
                                                    background: "linear-gradient(90deg, #06b6d4, #3b82f6)"
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="no-data-msg">No topic data available for selected class.</p>
                        )}
                    </div>
                </div>

                {/* Today's Activity Distribution */}
                <div className="analytics-panel">
                    <div className="panel-header">
                        <div>
                            <h3>Today's Activity Distribution</h3>
                            <p>Breakdown of problems solved by students today</p>
                        </div>
                    </div>

                    <div className="distribution-chart-wrapper">
                        <ResponsiveContainer width="100%" height={210}>
                            <BarChart data={distributionChartData} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                                <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
                                <YAxis allowDecimals={false} stroke="#94a3b8" fontSize={12} />
                                <Tooltip
                                    formatter={(value, name, item) => [
                                        `${value} students (${item.payload.percentage}%)`,
                                        "Students"
                                    ]}
                                    contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "8px", color: "#f8fafc" }}
                                />
                                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                                    {distributionChartData.map((entry, index) => (
                                        <Cell key={`dist-cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="distribution-legend">
                        {distributionChartData.map((item, idx) => (
                            <div key={idx} className="legend-item">
                                <span className="dot" style={{ backgroundColor: item.color }}></span>
                                <span className="label">{item.category}:</span>
                                <strong>{item.count}</strong>
                                <span className="pct">({item.percentage}%)</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Section 4: Feature 4 — Topic x Difficulty Matrix Table */}
            <section className="analytics-panel full-panel">
                <div className="panel-header-with-actions">
                    <div>
                        <h3>Topic × Difficulty Intelligence Matrix</h3>
                        <p>Complete topic breakdown mapped across Easy, Medium, and Hard problems</p>
                    </div>

                    <div className="matrix-search-box">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            className="matrix-search-input"
                            placeholder="Filter topics..."
                            value={matrixSearch}
                            onChange={(e) => setMatrixSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="table-responsive">
                    <table className="mini-analytics-table full-table">
                        <thead>
                            <tr>
                                <th className="sortable-th" onClick={() => handleMatrixSort("topic")}>
                                    Topic {matrixSortBy === "topic" && (matrixSortOrder === "asc" ? "▲" : "▼")}
                                </th>
                                <th className="sortable-th text-center" onClick={() => handleMatrixSort("easy")}>
                                    Easy {matrixSortBy === "easy" && (matrixSortOrder === "asc" ? "▲" : "▼")}
                                </th>
                                <th className="sortable-th text-center" onClick={() => handleMatrixSort("medium")}>
                                    Medium {matrixSortBy === "medium" && (matrixSortOrder === "asc" ? "▲" : "▼")}
                                </th>
                                <th className="sortable-th text-center" onClick={() => handleMatrixSort("hard")}>
                                    Hard {matrixSortBy === "hard" && (matrixSortOrder === "asc" ? "▲" : "▼")}
                                </th>
                                <th className="sortable-th text-center" onClick={() => handleMatrixSort("total")}>
                                    Total Solved {matrixSortBy === "total" && (matrixSortOrder === "asc" ? "▲" : "▼")}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {topicDifficultyMatrix.length > 0 ? (
                                topicDifficultyMatrix.slice(0, 15).map((row, idx) => (
                                    <tr key={idx}>
                                        <td><strong className="topic-title-text">{row.topic}</strong></td>
                                        <td className="text-center text-easy">{row.easy}</td>
                                        <td className="text-center text-medium">{row.medium}</td>
                                        <td className="text-center text-hard">{row.hard}</td>
                                        <td className="text-center"><strong>{row.total}</strong></td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="no-data-msg">No topic records matching search.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Section 5: Weekly Movers & Yesterday's Top Performers */}
            <section className="analytics-grid-two">
                {/* Weekly Movers */}
                <div className="analytics-panel">
                    <div className="panel-header">
                        <div>
                            <h3>Weekly Movers</h3>
                            <p>Top students by weekly problem improvement</p>
                        </div>
                    </div>

                    <div className="movers-table-wrapper">
                        <table className="mini-analytics-table">
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Student</th>
                                    <th>Department</th>
                                    <th>Weekly Improvement</th>
                                </tr>
                            </thead>
                            <tbody>
                                {weeklyTop.length > 0 ? (
                                    weeklyTop.slice(0, 5).map((student, idx) => (
                                        <tr
                                            key={student.rollNumber || idx}
                                            onClick={() => onSelectStudent && onSelectStudent(student)}
                                            style={{ cursor: "pointer" }}
                                        >
                                            <td className="rank-cell">#{idx + 1}</td>
                                            <td>
                                                <div className="student-mini-cell">
                                                    <div className="mini-avatar">{getInitials(student.name)}</div>
                                                    <span className="name">{student.name}</span>
                                                </div>
                                            </td>
                                            <td className="dept-cell">{student.department || "CSD"}</td>
                                            <td className="positive-cell">+{student.weeklyProblemsSolved}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="no-data-msg">No weekly movers record.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Yesterday's Top Performers */}
                <div className="analytics-panel">
                    <div className="panel-header">
                        <div>
                            <h3>Yesterday's Top Performers</h3>
                            <p>Students with highest activity on previous snapshot</p>
                        </div>
                    </div>

                    <div className="movers-table-wrapper">
                        <table className="mini-analytics-table">
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Student</th>
                                    <th>Department</th>
                                    <th>Solved Yesterday</th>
                                </tr>
                            </thead>
                            <tbody>
                                {yesterdayTop.length > 0 ? (
                                    yesterdayTop.slice(0, 5).map((student, idx) => (
                                        <tr
                                            key={student.rollNumber || idx}
                                            onClick={() => onSelectStudent && onSelectStudent(student)}
                                            style={{ cursor: "pointer" }}
                                        >
                                            <td className="rank-cell">#{idx + 1}</td>
                                            <td>
                                                <div className="student-mini-cell">
                                                    <div className="mini-avatar">{getInitials(student.name)}</div>
                                                    <span className="name">{student.name}</span>
                                                </div>
                                            </td>
                                            <td className="dept-cell">{student.department || "CSD"}</td>
                                            <td className="positive-cell">+{student.problemsSolved}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="no-data-msg">No yesterday activity recorded.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* Section 6: Inactive Students Section */}
            <section className="analytics-panel full-panel">
                <div className="panel-header-with-actions">
                    <div>
                        <h3>Inactive Students Roster</h3>
                        <p>Students requiring academic follow-up based on historical activity</p>
                    </div>

                    <div className="inactivity-filter-bar">
                        <button
                            className={`filter-btn ${inactivityFilter === "all" ? "active" : ""}`}
                            onClick={() => setInactivityFilter("all")}
                        >
                            All ({inactiveStudents.length})
                        </button>
                        <button
                            className={`filter-btn ${inactivityFilter === "recent" ? "active" : ""}`}
                            onClick={() => setInactivityFilter("recent")}
                        >
                            Recent (7-14d) ({inactiveCount})
                        </button>
                        <button
                            className={`filter-btn ${inactivityFilter === "longterm" ? "active" : ""}`}
                            onClick={() => setInactivityFilter("longterm")}
                        >
                            Long-Term (15d+) ({inactiveStudents.filter((s) => s.inactivityType === "INACTIVE_LONG_TERM").length})
                        </button>
                        <button
                            className={`filter-btn ${inactivityFilter === "never" ? "active" : ""}`}
                            onClick={() => setInactivityFilter("never")}
                        >
                            Never Active ({neverActiveCount})
                        </button>
                    </div>
                </div>

                <div className="table-responsive">
                    <table className="mini-analytics-table full-table">
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Roll Number</th>
                                <th>Department</th>
                                <th>Total Solved</th>
                                <th>Last Active Date</th>
                                <th>Days Inactive</th>
                                <th>Inactivity Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredInactiveStudents.length > 0 ? (
                                filteredInactiveStudents.map((student, idx) => {
                                    const badge = getInactivityBadge(student.inactivityType);
                                    return (
                                        <tr
                                            key={student.rollNumber || idx}
                                            onClick={() => onSelectStudent && onSelectStudent(student)}
                                            style={{ cursor: "pointer" }}
                                        >
                                            <td>
                                                <div className="student-mini-cell">
                                                    <div className="mini-avatar">{getInitials(student.name)}</div>
                                                    <span className="name">{student.name}</span>
                                                </div>
                                            </td>
                                            <td className="code-text">{student.rollNumber}</td>
                                            <td>{student.department}</td>
                                            <td><strong>{student.totalSolved}</strong></td>
                                            <td>{student.lastActiveDate}</td>
                                            <td>
                                                {student.daysSinceLastActivity !== null && student.daysSinceLastActivity !== undefined
                                                    ? `${student.daysSinceLastActivity} days`
                                                    : "N/A"}
                                            </td>
                                            <td>
                                                <span className={`inactivity-badge ${badge.className}`}>
                                                    {badge.text}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="7" className="no-data-msg">
                                        No inactive students found matching selected criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {onNavigateToTab && (
                    <div className="panel-footer-action">
                        <button className="view-roster-btn" onClick={() => onNavigateToTab("students")}>
                            View Full Students Roster →
                        </button>
                    </div>
                )}
            </section>
        </div>
    );
}

export default AnalyticsPage;
