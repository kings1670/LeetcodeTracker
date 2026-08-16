import { studentsData as fallbackStudents } from "../data/studentsData";

// Data Service for fetching live generated LeetCode JSON stats
let cachedData = null;

export async function fetchDashboardData() {
    if (cachedData) {
        return cachedData;
    }

    try {
        const baseUrl = import.meta.env.BASE_URL || "/";
        const dataUrl = `${baseUrl.endsWith("/") ? baseUrl : baseUrl + "/"}data/leetcode-data.json`;
        const response = await fetch(dataUrl, {
            cache: "no-cache",
            headers: {
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        cachedData = data;
        return data;
    } catch (error) {
        console.warn("[dashboardData] Failed to load live /data/leetcode-data.json. Using fallback dataset.", error);

        const totalStudents = fallbackStudents.length;
        const activeStudents = fallbackStudents.filter(s => s.status === "Active").length;
        const totalSolved = fallbackStudents.reduce((acc, s) => acc + s.totalSolved, 0);
        const solvedToday = fallbackStudents.reduce((acc, s) => acc + s.improvement, 0);
        const easyTotal = fallbackStudents.reduce((acc, s) => acc + s.easy, 0);
        const mediumTotal = fallbackStudents.reduce((acc, s) => acc + s.medium, 0);
        const hardTotal = fallbackStudents.reduce((acc, s) => acc + s.hard, 0);

        const todayStr = new Date().toISOString().split("T")[0];

        const fallbackPayload = {
            isFallback: true,
            latestDate: todayStr,
            latestDateFormatted: "Today (Fallback)",
            classes: ["III CSD A", "II CSD A"],
            summary: {
                totalStudents,
                activeStudents,
                totalProblemsSolved: totalSolved,
                solvedToday,
                weeklyImprovement: 184,
                easyTotal,
                mediumTotal,
                hardTotal,
                avgSolved: Math.round(totalSolved / totalStudents)
            },
            dailyTrend: [
                { date: "2026-08-01", day: "01 Aug", solved: 120 },
                { date: "2026-08-02", day: "02 Aug", solved: 140 },
                { date: "2026-08-03", day: "03 Aug", solved: 180 },
                { date: "2026-08-04", day: "04 Aug", solved: 210 },
                { date: "2026-08-05", day: "05 Aug", solved: 250 },
                { date: "2026-08-06", day: "06 Aug", solved: 290 },
                { date: "2026-08-07", day: "07 Aug", solved: 340 }
            ],
            fullHistoryTrend: [
                { date: "2026-08-01", day: "01 Aug", solved: 120 },
                { date: "2026-08-02", day: "02 Aug", solved: 140 },
                { date: "2026-08-03", day: "03 Aug", solved: 180 },
                { date: "2026-08-04", day: "04 Aug", solved: 210 },
                { date: "2026-08-05", day: "05 Aug", solved: 250 },
                { date: "2026-08-06", day: "06 Aug", solved: 290 },
                { date: "2026-08-07", day: "07 Aug", solved: 340 }
            ],
            classDailyTrends: {
                "III CSD A": [
                    { date: "2026-08-01", day: "01 Aug", solved: 80 },
                    { date: "2026-08-07", day: "07 Aug", solved: 200 }
                ],
                "II CSD A": [
                    { date: "2026-08-01", day: "01 Aug", solved: 40 },
                    { date: "2026-08-07", day: "07 Aug", solved: 140 }
                ]
            },
            classSummaries: {
                "III CSD A": {
                    totalStudents: 6,
                    activeStudents: 5,
                    totalProblemsSolved: Math.round(totalSolved * 0.6),
                    solvedToday: 25,
                    weeklyImprovement: 120,
                    easyTotal: Math.round(easyTotal * 0.6),
                    mediumTotal: Math.round(mediumTotal * 0.6),
                    hardTotal: Math.round(hardTotal * 0.6),
                    avgSolved: Math.round((totalSolved * 0.6) / 6)
                },
                "II CSD A": {
                    totalStudents: 4,
                    activeStudents: 3,
                    totalProblemsSolved: Math.round(totalSolved * 0.4),
                    solvedToday: 12,
                    weeklyImprovement: 64,
                    easyTotal: Math.round(easyTotal * 0.4),
                    mediumTotal: Math.round(mediumTotal * 0.4),
                    hardTotal: Math.round(hardTotal * 0.4),
                    avgSolved: Math.round((totalSolved * 0.4) / 4)
                }
            },
            classTopPerformers: {
                "III CSD A": fallbackStudents.slice(0, 3),
                "II CSD A": fallbackStudents.slice(3, 6)
            },
            students: fallbackStudents,
            topPerformers: fallbackStudents.slice(0, 3),
            dailySnapshots: {
                [todayStr]: {
                    date: todayStr,
                    dateFormatted: "Today",
                    summary: {
                        totalSolved,
                        easyTotal,
                        mediumTotal,
                        hardTotal,
                        activeStudents,
                        improvedCount: 6,
                        noChangeCount: 4,
                        declinedCount: 0
                    },
                    students: fallbackStudents.map((s, idx) => ({
                        rank: idx + 1,
                        rollNumber: s.rollNumber,
                        name: s.name,
                        department: s.rollNumber.includes("CSD00") ? "III CSD A" : "II CSD A",
                        easy: s.easy,
                        medium: s.medium,
                        hard: s.hard,
                        totalSolved: s.totalSolved,
                        improvement: s.improvement
                    }))
                }
            }
        };

        cachedData = fallbackPayload;
        return fallbackPayload;
    }
}

export function clearDashboardCache() {
    cachedData = null;
}

// Helper: Get available class names list
export function getAvailableClasses(data) {
    if (!data || !data.classes) return ["All Classes"];
    return ["All Classes", ...data.classes];
}

// Helper: Get class summary
export function getClassSummary(data, className) {
    if (!data) return {};
    if (!className || className === "All Classes") {
        return data.summary || {};
    }
    return data.classSummaries?.[className] || {};
}

// Helper: Get class daily trend chart data
export function getClassDailyTrend(data, className, timeframe = "7d") {
    if (!data) return [];
    let trend = [];

    if (!className || className === "All Classes") {
        trend = data.fullHistoryTrend || data.dailyTrend || [];
    } else {
        trend = data.classDailyTrends?.[className] || [];
    }

    if (timeframe === "7d") {
        return trend.slice(-7);
    } else if (timeframe === "30d") {
        return trend.slice(-30);
    }
    return trend; // "all"
}

// Helper: Get top performers for class
export function getClassTopPerformers(data, className) {
    if (!data) return [];
    if (!className || className === "All Classes") {
        return data.topPerformers || [];
    }
    return data.classTopPerformers?.[className] || [];
}

// Helper: Get all calendar dates with performance snapshots
export function getCalendarDatesWithData(data) {
    if (!data || !data.dailySnapshots) return [];
    return Object.keys(data.dailySnapshots);
}

// Helper: Get day-wise snapshot for calendar modal
export function getDayPerformanceSnapshot(data, dateStr, className = "All Classes") {
    if (!data || !data.dailySnapshots || !data.dailySnapshots[dateStr]) {
        return null;
    }

    const snapshot = data.dailySnapshots[dateStr];

    if (!className || className === "All Classes") {
        return {
            date: snapshot.date,
            dateFormatted: snapshot.dateFormatted,
            summary: snapshot.summary,
            students: snapshot.students || []
        };
    }

    // Filter snapshot for specific class
    const classStudents = (snapshot.students || []).filter(s => s.department === className);
    const classSummary = snapshot.classSummaries?.[className] || {
        total: 0, easy: 0, medium: 0, hard: 0, active: 0, improved: 0, nochange: 0, declined: 0
    };

    return {
        date: snapshot.date,
        dateFormatted: snapshot.dateFormatted,
        summary: {
            totalSolved: classSummary.total || 0,
            easyTotal: classSummary.easy || 0,
            mediumTotal: classSummary.medium || 0,
            hardTotal: classSummary.hard || 0,
            activeStudents: classSummary.active || 0,
            improvedCount: classSummary.improved || 0,
            noChangeCount: classSummary.nochange || 0,
            declinedCount: classSummary.declined || 0
        },
        students: classStudents
    };
}

let cachedActivityData = null;

export async function fetchActivityAnalysis() {
    if (cachedActivityData) {
        return cachedActivityData;
    }

    try {
        const baseUrl = import.meta.env.BASE_URL || "/";
        const dataUrl = `${baseUrl.endsWith("/") ? baseUrl : baseUrl + "/"}data/activity-analysis.json`;
        const response = await fetch(dataUrl, {
            cache: "no-cache",
            headers: {
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        cachedActivityData = data;
        return data;
    } catch (error) {
        console.warn("[dashboardData] Failed to load /data/activity-analysis.json.", error);
        return null;
    }
}

let cachedLatestSubmissions = null;
let cachedProblemCache = null;

export async function fetchLatestSubmissions() {
    if (cachedLatestSubmissions) return cachedLatestSubmissions;
    try {
        const baseUrl = import.meta.env.BASE_URL || "/";
        const dataUrl = `${baseUrl.endsWith("/") ? baseUrl : baseUrl + "/"}data/latest-submissions.json`;
        const response = await fetch(dataUrl, { cache: "no-cache", headers: { "Accept": "application/json" } });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        cachedLatestSubmissions = data;
        return data;
    } catch (error) {
        console.warn("[dashboardData] Failed to load latest-submissions.json", error);
        return null;
    }
}

export async function fetchProblemCache() {
    if (cachedProblemCache) return cachedProblemCache;
    try {
        const baseUrl = import.meta.env.BASE_URL || "/";
        const dataUrl = `${baseUrl.endsWith("/") ? baseUrl : baseUrl + "/"}data/problem-cache.json`;
        const response = await fetch(dataUrl, { cache: "no-cache", headers: { "Accept": "application/json" } });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        cachedProblemCache = data;
        return data;
    } catch (error) {
        console.warn("[dashboardData] Failed to load problem-cache.json", error);
        return null;
    }
}


