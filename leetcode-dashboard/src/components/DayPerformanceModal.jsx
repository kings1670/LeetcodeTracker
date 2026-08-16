import { useState, useMemo } from "react";
import { getDayPerformanceSnapshot, getAvailableClasses } from "../services/dashboardData";
import "./DayPerformanceModal.css";

function DayPerformanceModal({ dateStr, dashboardData, onClose }) {
    const [selectedClass, setSelectedClass] = useState("All Classes");
    const [searchTerm, setSearchTerm] = useState("");

    const availableClasses = useMemo(() => getAvailableClasses(dashboardData), [dashboardData]);

    const snapshot = useMemo(() => {
        return getDayPerformanceSnapshot(dashboardData, dateStr, selectedClass);
    }, [dashboardData, dateStr, selectedClass]);

    if (!snapshot) {
        return null;
    }

    const summary = snapshot.summary || {};
    const students = snapshot.students || [];

    const filteredStudents = students.filter(s => {
        if (!searchTerm) return true;
        const query = searchTerm.toLowerCase();
        return (
            (s.name && s.name.toLowerCase().includes(query)) ||
            (s.rollNumber && s.rollNumber.toLowerCase().includes(query))
        );
    });

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    <div>
                        <h2>Day Performance: {snapshot.dateFormatted}</h2>
                        <p>Detailed LeetCode solving snapshot for {dateStr}</p>
                    </div>
                    <button className="modal-close-btn" onClick={onClose}>✕</button>
                </div>

                {/* Body */}
                <div className="modal-body">
                    {/* Stat Cards */}
                    <div className="day-stats-grid">
                        <div className="day-stat-card">
                            <p>Total Problems Solved</p>
                            <h4>{(summary.totalSolved || 0).toLocaleString()}</h4>
                            <span>
                                Easy: {summary.easyTotal || 0} | Med: {summary.mediumTotal || 0} | Hard: {summary.hardTotal || 0}
                            </span>
                        </div>

                        <div className="day-stat-card">
                            <p>Active Students</p>
                            <h4>{summary.activeStudents || 0}</h4>
                            <span>Submitted solutions</span>
                        </div>

                        <div className="day-stat-card">
                            <p>Improved Today</p>
                            <h4>
                                <span className="badge-improved">+{summary.improvedCount || 0}</span>
                            </h4>
                            <span>Increased problem count</span>
                        </div>

                        <div className="day-stat-card">
                            <p>Student Activity</p>
                            <h4>
                                <span className="badge-nochange">{summary.noChangeCount || 0}</span> No change
                            </h4>
                            <span>
                                {summary.declinedCount > 0 && (
                                    <span className="badge-declined"> ({summary.declinedCount} declined)</span>
                                )}
                            </span>
                        </div>
                    </div>

                    {/* Controls Bar */}
                    <div className="modal-controls">
                        <h3>Student Performance Roster</h3>

                        <div className="filters-group">
                            <div className="filter-item">
                                <label htmlFor="modal-class-select">Class:</label>
                                <select
                                    id="modal-class-select"
                                    className="filter-select"
                                    value={selectedClass}
                                    onChange={(e) => setSelectedClass(e.target.value)}
                                >
                                    {availableClasses.map(cls => (
                                        <option key={cls} value={cls}>{cls}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="search-box" style={{ minWidth: "200px" }}>
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder="Search student..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ padding: "8px 12px" }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="table-responsive">
                        <table className="students-table">
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Student</th>
                                    <th>Roll Number</th>
                                    <th>Class</th>
                                    <th>Easy</th>
                                    <th>Medium</th>
                                    <th>Hard</th>
                                    <th>Total Solved</th>
                                    <th>Improvement</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.length > 0 ? (
                                    filteredStudents.map((s, idx) => (
                                        <tr key={s.rollNumber || idx}>
                                            <td className="rank-cell">{s.rank || idx + 1}</td>
                                            <td className="student-name-text">{s.name}</td>
                                            <td className="roll-cell">{s.rollNumber}</td>
                                            <td>{s.department}</td>
                                            <td>{s.easy}</td>
                                            <td>{s.medium}</td>
                                            <td>{s.hard}</td>
                                            <td><strong>{s.totalSolved}</strong></td>
                                            <td className={s.improvement > 0 ? "positive" : ""}>
                                                {s.improvement > 0 ? `+${s.improvement}` : s.improvement}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="9" className="no-results">
                                            No student records found for this date.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default DayPerformanceModal;
