import { useState, useMemo, useEffect } from "react";
import { fetchDashboardData } from "../services/dashboardData";
import "./StudentsPage.css";

function StudentsPage({ dashboardData: initialDashboardData, onSelectStudent }) {
    const [dashboardData, setDashboardData] = useState(initialDashboardData);
    const [loading, setLoading] = useState(!initialDashboardData);
    const [searchTerm, setSearchTerm] = useState("");
    const [performanceFilter, setPerformanceFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortBy, setSortBy] = useState("totalSolved");
    const [sortOrder, setSortOrder] = useState("desc");

    useEffect(() => {
        if (!dashboardData) {
            let isMounted = true;
            fetchDashboardData()
                .then((data) => {
                    if (isMounted) {
                        setDashboardData(data);
                        setLoading(false);
                    }
                })
                .catch((err) => {
                    console.error("Failed to load students data:", err);
                    if (isMounted) setLoading(false);
                });
            return () => {
                isMounted = false;
            };
        }
    }, [dashboardData]);

    const studentsList = dashboardData?.students || [];
    const summary = dashboardData?.summary || {};

    // Metrics Calculation
    const totalStudentsCount = summary.totalStudents || studentsList.length;
    const activeStudentsCount = summary.activeStudents || studentsList.filter(s => s.status === "Active").length;
    const totalSolvedSum = summary.totalProblemsSolved || studentsList.reduce((acc, curr) => acc + curr.totalSolved, 0);
    const avgSolved = summary.avgSolved || (totalStudentsCount > 0 ? Math.round(totalSolvedSum / totalStudentsCount) : 0);

    // Helper for student initials
    const getInitials = (name) => {
        if (!name) return "";
        const parts = name.trim().split(" ");
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    // Filter and sort students
    const filteredAndSortedStudents = useMemo(() => {
        return studentsList
            .filter((student) => {
                // Search matching (Name, Roll Number, LeetCode Username)
                const query = searchTerm.toLowerCase().trim();
                const matchesSearch =
                    !query ||
                    (student.name && student.name.toLowerCase().includes(query)) ||
                    (student.rollNumber && student.rollNumber.toLowerCase().includes(query)) ||
                    (student.leetcodeUsername && student.leetcodeUsername.toLowerCase().includes(query));

                // Performance Filter
                let matchesPerformance = true;
                if (performanceFilter === "high") {
                    matchesPerformance = student.totalSolved >= 100;
                } else if (performanceFilter === "medium") {
                    matchesPerformance = student.totalSolved >= 30 && student.totalSolved < 100;
                } else if (performanceFilter === "low") {
                    matchesPerformance = student.totalSolved < 30;
                }

                // Status Filter
                let matchesStatus = true;
                if (statusFilter === "active") {
                    matchesStatus = student.status === "Active";
                } else if (statusFilter === "inactive") {
                    matchesStatus = student.status === "Inactive";
                }

                return matchesSearch && matchesPerformance && matchesStatus;
            })
            .sort((a, b) => {
                let valA = a[sortBy];
                let valB = b[sortBy];

                if (typeof valA === "string") {
                    valA = (valA || "").toLowerCase();
                    valB = (valB || "").toLowerCase();
                    return sortOrder === "asc"
                        ? valA.localeCompare(valB)
                        : valB.localeCompare(valA);
                }

                valA = valA || 0;
                valB = valB || 0;
                return sortOrder === "asc" ? valA - valB : valB - valA;
            });
    }, [studentsList, searchTerm, performanceFilter, statusFilter, sortBy, sortOrder]);

    const handleSortChange = (field) => {
        if (sortBy === field) {
            setSortOrder(prev => (prev === "asc" ? "desc" : "asc"));
        } else {
            setSortBy(field);
            setSortOrder("desc");
        }
    };

    return (
        <div className="students-container">
            {/* Page Header */}
            <header className="students-header">
                <div>
                    <h1>Students</h1>
                    <p>CSD LeetCode Performance Tracker</p>
                </div>
            </header>

            {/* Summary Cards */}
            <section className="students-summary-grid">
                <div className="students-stat-card">
                    <div className="students-stat-icon icon-blue">👨‍🎓</div>
                    <div className="students-stat-info">
                        <p>Total Students</p>
                        <h3>{loading ? "..." : totalStudentsCount}</h3>
                        <span>Registered CSD Students</span>
                    </div>
                </div>

                <div className="students-stat-card">
                    <div className="students-stat-icon icon-green">⚡</div>
                    <div className="students-stat-info">
                        <p>Active Students</p>
                        <h3>{loading ? "..." : activeStudentsCount}</h3>
                        <span>Actively solving problems</span>
                    </div>
                </div>

                <div className="students-stat-card">
                    <div className="students-stat-icon icon-amber">✓</div>
                    <div className="students-stat-info">
                        <p>Total Problems Solved</p>
                        <h3>{loading ? "..." : totalSolvedSum.toLocaleString()}</h3>
                        <span>Combined solutions</span>
                    </div>
                </div>

                <div className="students-stat-card">
                    <div className="students-stat-icon icon-purple">📈</div>
                    <div className="students-stat-info">
                        <p>Average Problems Solved</p>
                        <h3>{loading ? "..." : avgSolved}</h3>
                        <span>Per student average</span>
                    </div>
                </div>
            </section>

            {/* Controls Toolbar: Search & Filters */}
            <section className="students-controls">
                <div className="search-box">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search by Name, Roll Number, or Username..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="filters-group">
                    <div className="filter-item">
                        <label htmlFor="perf-filter">Performance:</label>
                        <select
                            id="perf-filter"
                            className="filter-select"
                            value={performanceFilter}
                            onChange={(e) => setPerformanceFilter(e.target.value)}
                        >
                            <option value="all">All Levels</option>
                            <option value="high">High (100+ solved)</option>
                            <option value="medium">Medium (30-99 solved)</option>
                            <option value="low">Low (&lt;30 solved)</option>
                        </select>
                    </div>

                    <div className="filter-item">
                        <label htmlFor="status-filter">Status:</label>
                        <select
                            id="status-filter"
                            className="filter-select"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>

                    <div className="filter-item">
                        <label htmlFor="sort-select">Sort By:</label>
                        <select
                            id="sort-select"
                            className="filter-select"
                            value={`${sortBy}-${sortOrder}`}
                            onChange={(e) => {
                                const [field, order] = e.target.value.split("-");
                                setSortBy(field);
                                setSortOrder(order);
                            }}
                        >
                            <option value="totalSolved-desc">Total Solved (High to Low)</option>
                            <option value="totalSolved-asc">Total Solved (Low to High)</option>
                            <option value="name-asc">Name (A to Z)</option>
                            <option value="name-desc">Name (Z to A)</option>
                            <option value="improvement-desc">Improvement (Highest)</option>
                            <option value="streak-desc">Streak (Longest)</option>
                        </select>
                    </div>
                </div>
            </section>

            {/* Students Table */}
            <section className="students-table-panel">
                <div className="table-header-bar">
                    <h3>CSD Student Performance Roster</h3>
                    <span className="result-count">
                        Showing {filteredAndSortedStudents.length} of {totalStudentsCount} students
                    </span>
                </div>

                <div className="table-responsive">
                    <table className="students-table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th className="sortable" onClick={() => handleSortChange("name")}>
                                    Student {sortBy === "name" && (sortOrder === "asc" ? "▲" : "▼")}
                                </th>
                                <th>Roll Number</th>
                                <th>LeetCode Username</th>
                                <th>Easy</th>
                                <th>Medium</th>
                                <th>Hard</th>
                                <th className="sortable" onClick={() => handleSortChange("totalSolved")}>
                                    Total {sortBy === "totalSolved" && (sortOrder === "asc" ? "▲" : "▼")}
                                </th>
                                <th className="sortable" onClick={() => handleSortChange("improvement")}>
                                    Improvement {sortBy === "improvement" && (sortOrder === "asc" ? "▲" : "▼")}
                                </th>
                                <th className="sortable" onClick={() => handleSortChange("streak")}>
                                    Streak {sortBy === "streak" && (sortOrder === "asc" ? "▲" : "▼")}
                                </th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="11" className="no-results">
                                        Loading student records...
                                    </td>
                                </tr>
                            ) : filteredAndSortedStudents.length > 0 ? (
                                filteredAndSortedStudents.map((student, index) => {
                                    const rank = index + 1;
                                    const rankClass =
                                        rank === 1
                                            ? "rank-1"
                                            : rank === 2
                                            ? "rank-2"
                                            : rank === 3
                                            ? "rank-3"
                                            : "";

                                    return (
                                        <tr
                                            key={student.id || student.rollNumber || index}
                                            onClick={() => onSelectStudent && onSelectStudent(student)}
                                            style={{ cursor: "pointer" }}
                                        >
                                            <td className={`rank-cell ${rankClass}`}>{rank}</td>
                                            <td>
                                                <div className="student-info-cell">
                                                    <div className="student-avatar">
                                                        {getInitials(student.name)}
                                                    </div>
                                                    <span className="student-name-text">{student.name}</span>
                                                </div>
                                            </td>
                                            <td className="roll-cell">{student.rollNumber}</td>
                                            <td className="leetcode-cell">@{student.leetcodeUsername}</td>
                                            <td>{student.easy}</td>
                                            <td>{student.medium}</td>
                                            <td>{student.hard}</td>
                                            <td>
                                                <strong>{student.totalSolved}</strong>
                                            </td>
                                            <td className="positive">+{student.improvement}</td>
                                            <td>
                                                <span className="streak-badge">
                                                    🔥 {student.streak}d
                                                </span>
                                            </td>
                                            <td>
                                                <span
                                                    className={`status-badge ${
                                                        student.status === "Active"
                                                            ? "status-active"
                                                            : "status-inactive"
                                                    }`}
                                                >
                                                    {student.status}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="11" className="no-results">
                                        No students found matching your search and filter criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

export default StudentsPage;
