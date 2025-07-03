
export function getLastWeeksNumbers(data) {
    const now = new Date();

    // Get start of this week (Monday)
    const todayDay = now.getDay(); // Sunday = 0, Monday = 1
    const daysSinceMonday = todayDay === 0 ? 6 : todayDay - 1;

    const startOfThisWeek = new Date(now);
    startOfThisWeek.setDate(now.getDate() - daysSinceMonday);
    startOfThisWeek.setHours(0, 0, 0, 0);

    // Define last week range
    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    const endOfLastWeek = new Date(startOfThisWeek);
    endOfLastWeek.setMilliseconds(-1); // Sunday of last week at 23:59:59.999

    const result = {};

    for (const key in data) {
        const entry = data[key];
        const entryDate = new Date(entry.date);

        if (entryDate >= startOfLastWeek && entryDate <= endOfLastWeek) {
            const day = entry.dayOfWeek;

            // Initialize if not yet in result
            if (!result[day]) {
                result[day] = {
                    appointments: 0,
                    attempts: 0,
                    closed: 0,
                    contacts: 0,
                    doorsKnocked: 0,
                    executed: 0,
                    floaters: 0,
                    mailers: 0,
                    openHouses: 0
                };
            }

            // Sum all numeric fields
            for (const field in result[day]) {
                if (typeof entry[field] === 'number') {
                    result[day][field] += entry[field];
                }
            }
        }
    }

    return result;
}


export function generateWeeklyReportHTML(data) {
    const metrics = [
        "appointments", "attempts", "closed", "contacts",
        "doorsKnocked", "executed", "floaters", "mailers", "openHouses"
    ];
    const metricsLabel = {
        "appointments": "Appointments", "attempts": "Attempts", "closed": "Closed", "contacts": "Contacts",
        "doorsKnocked": "Doors Knocked", "executed": "Executed", "floaters": "Floaters", "mailers": "Mailes", "openHouses": "Open Houses"
    };

    const tableRows = Object.entries(data).map(([day, values]) => {
        const cells = metrics.map(metric => `<td style="padding-right:10px border:1px solid #ccc; padding:8px; text-align:center;">${values[metric] ?? 0}</td>`).join('');
        return `<tr>
      <td style="background-color:#e0e0e0; font-weight:bold; border:1px solid #ccc; padding:8px; text-align:center;">${day}</td>
      ${cells}
    </tr>`;
    }).join('');

    const tableHeaders = metrics.map(metric =>
        `<th style="background-color:#f4f4f4; border:1px margin:10px solid #ccc; padding:8px; text-align:center;">${metricsLabel[metric] || "N\A"}</th>`
    ).join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Last Week's Summary</title>
</head>
<body style="font-family: Arial, sans-serif; padding: 20px;">
  <h2 style="margin-bottom: 20px;">Last Week's Aggregated Data</h2>
  <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; width: 100%;">
    <thead>
      <tr>
        <th style="background-color:#f4f4f4; border:1px solid #ccc; padding:8px; text-align:center;">Day</th>
        ${tableHeaders}
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>
</body>
</html>
  `.replaceAll('\n', "");
}
