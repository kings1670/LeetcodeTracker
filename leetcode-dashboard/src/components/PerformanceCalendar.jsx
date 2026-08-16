import { useState, useMemo } from "react";
import { getCalendarDatesWithData } from "../services/dashboardData";
import DayPerformanceModal from "./DayPerformanceModal";
import "./PerformanceCalendar.css";

function PerformanceCalendar({ dashboardData }) {
    // Determine initial year and month from latestDate or today
    const latestDate = dashboardData?.latestDate ? new Date(dashboardData.latestDate) : new Date();
    const [currentYear, setCurrentYear] = useState(latestDate.getFullYear());
    const [currentMonth, setCurrentMonth] = useState(latestDate.getMonth()); // 0-indexed (0=Jan)

    const [selectedDateModal, setSelectedDateModal] = useState(null);

    const datesWithData = useMemo(() => {
        const set = new Set(getCalendarDatesWithData(dashboardData));
        return set;
    }, [dashboardData]);

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const handlePrevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(prev => prev - 1);
        } else {
            setCurrentMonth(prev => prev - 1);
        }
    };

    const handleNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(prev => prev + 1);
        } else {
            setCurrentMonth(prev => prev + 1);
        }
    };

    // Build calendar grid cells
    const calendarCells = useMemo(() => {
        const cells = [];
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);

        // Day of week for 1st day (0=Sun, 1=Mon... convert to Mon=0...Sun=6)
        let startingDay = firstDay.getDay() - 1;
        if (startingDay === -1) startingDay = 6;

        // Previous month padding
        const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
        for (let i = startingDay - 1; i >= 0; i--) {
            const dayNum = prevMonthLastDay - i;
            cells.push({
                dayNumber: dayNum,
                isCurrentMonth: false,
                dateStr: ""
            });
        }

        // Current month days
        for (let i = 1; i <= lastDay.getDate(); i++) {
            const mStr = String(currentMonth + 1).padStart(2, '0');
            const dStr = String(i).padStart(2, '0');
            const dateStr = `${currentYear}-${mStr}-${dStr}`;
            const hasData = datesWithData.has(dateStr);

            // Get snapshot info if available
            const snapshot = dashboardData?.dailySnapshots?.[dateStr];
            const solved = snapshot?.summary?.totalSolved || 0;

            cells.push({
                dayNumber: i,
                isCurrentMonth: true,
                dateStr,
                hasData,
                solved
            });
        }

        // Next month padding to fill grid
        const totalCells = cells.length;
        const remainingCells = (7 - (totalCells % 7)) % 7;
        for (let i = 1; i <= remainingCells; i++) {
            cells.push({
                dayNumber: i,
                isCurrentMonth: false,
                dateStr: ""
            });
        }

        return cells;
    }, [currentYear, currentMonth, datesWithData, dashboardData]);

    return (
        <div className="calendar-panel">
            {/* Header Toolbar */}
            <div className="calendar-header">
                <div className="calendar-header-title">
                    <h3>Performance Calendar</h3>
                    <p>Click any highlighted date to view day-wise student performance snapshot</p>
                </div>

                <div className="calendar-nav">
                    <button className="calendar-nav-btn" onClick={handlePrevMonth}>‹</button>
                    <span className="calendar-month-title">
                        {monthNames[currentMonth]} {currentYear}
                    </span>
                    <button className="calendar-nav-btn" onClick={handleNextMonth}>›</button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="calendar-grid">
                {/* Day Labels */}
                <div className="calendar-day-label">Mon</div>
                <div className="calendar-day-label">Tue</div>
                <div className="calendar-day-label">Wed</div>
                <div className="calendar-day-label">Thu</div>
                <div className="calendar-day-label">Fri</div>
                <div className="calendar-day-label">Sat</div>
                <div className="calendar-day-label">Sun</div>

                {/* Day Cells */}
                {calendarCells.map((cell, idx) => {
                    if (!cell.isCurrentMonth) {
                        return (
                            <div key={idx} className="calendar-cell other-month">
                                <span className="cell-date-num">{cell.dayNumber}</span>
                            </div>
                        );
                    }

                    return (
                        <div
                            key={cell.dateStr}
                            className={`calendar-cell ${cell.hasData ? "has-data" : ""}`}
                            onClick={() => cell.hasData && setSelectedDateModal(cell.dateStr)}
                            title={cell.hasData ? `Click to view snapshot for ${cell.dateStr}` : "No data snapshot"}
                        >
                            <span className="cell-date-num">{cell.dayNumber}</span>
                            {cell.hasData && (
                                <div className="cell-indicator">
                                    <span className="cell-dot"></span>
                                    <span className="cell-badge">✓ Snapshot</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Modal Popup */}
            {selectedDateModal && (
                <DayPerformanceModal
                    dateStr={selectedDateModal}
                    dashboardData={dashboardData}
                    onClose={() => setSelectedDateModal(null)}
                />
            )}
        </div>
    );
}

export default PerformanceCalendar;
