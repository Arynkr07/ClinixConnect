import env from '../config/env.js';

async function getAccessToken() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    return null;
  }

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: GOOGLE_REFRESH_TOKEN,
        grant_type: 'refresh_token',
      }),
    });

    const data = await res.json();
    return data.access_token || null;
  } catch (err) {
    console.warn('[calendarService] Failed to obtain OAuth access token:', err.message);
    return null;
  }
}

export const calendarService = {
  /**
   * Generates a direct Google Calendar Web Link for 1-click sync
   */
  generateGoogleCalendarWebLink({ summary, description, location = 'ClinixConnect Healthcare Clinic', dateStr, startTime, endTime }) {
    const formattedDate = String(dateStr || '').slice(0, 10).replace(/-/g, '');
    const startFormatted = String(startTime || '10:00').replace(':', '') + '00';
    const endFormatted = String(endTime || '10:30').replace(':', '') + '00';

    const dates = `${formattedDate}T${startFormatted}/${formattedDate}T${endFormatted}`;
    const text = encodeURIComponent(summary || 'Doctor Consultation');
    const details = encodeURIComponent(description || 'Consultation via ClinixConnect');
    const loc = encodeURIComponent(location);

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&details=${details}&location=${loc}&dates=${dates}`;
  },

  /**
   * Create Google Calendar Event via OAuth 2.0 for both Doctor & Patient on Booking
   */
  async createOAuthCalendarEvent({ summary, description, location = 'ClinixConnect Clinic', dateStr, startTime, endTime, patientEmail, doctorEmail }) {
    const token = await getAccessToken();
    const dateFormatted = String(dateStr || '').slice(0, 10);
    const startIso = `${dateFormatted}T${startTime || '10:00'}:00`;
    const endIso = `${dateFormatted}T${endTime || '10:30'}:00`;

    if (!token) {
      console.log('[Google Calendar OAuth] Credentials not set in .env. Falling back to direct Web Link invite.');
      return {
        success: false,
        webLink: this.generateGoogleCalendarWebLink({ summary, description, location, dateStr: dateFormatted, startTime, endTime }),
      };
    }

    const attendees = [];
    if (patientEmail) attendees.push({ email: patientEmail, displayName: 'Patient' });
    if (doctorEmail) attendees.push({ email: doctorEmail, displayName: 'Doctor' });

    try {
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: summary || 'Doctor Consultation',
          description: description || 'Healthcare consultation booked via ClinixConnect',
          location,
          start: { dateTime: startIso, timeZone: 'Asia/Kolkata' },
          end: { dateTime: endIso, timeZone: 'Asia/Kolkata' },
          attendees,
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 24 * 60 },
              { method: 'popup', minutes: 30 },
            ],
          },
        }),
      });

      const data = await response.json();
      console.log('[Google Calendar OAuth] Event created for both Doctor & Patient! Event ID:', data.id);
      return { success: true, eventId: data.id, htmlLink: data.htmlLink };
    } catch (err) {
      console.error('[Google Calendar OAuth Error] Event creation failed:', err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Update / Reschedule Google Calendar Event via OAuth 2.0
   */
  async updateOAuthCalendarEvent({ eventId, summary, description, location = 'ClinixConnect Clinic', dateStr, startTime, endTime, patientEmail, doctorEmail }) {
    if (!eventId) return { success: false };
    const token = await getAccessToken();
    if (!token) return { success: false };

    const dateFormatted = String(dateStr || '').slice(0, 10);
    const startIso = `${dateFormatted}T${startTime || '10:00'}:00`;
    const endIso = `${dateFormatted}T${endTime || '10:30'}:00`;

    const attendees = [];
    if (patientEmail) attendees.push({ email: patientEmail });
    if (doctorEmail) attendees.push({ email: doctorEmail });

    try {
      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}?sendUpdates=all`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: summary || 'Doctor Consultation (Rescheduled)',
          description: description || 'Healthcare consultation rescheduled via ClinixConnect',
          location,
          start: { dateTime: startIso, timeZone: 'Asia/Kolkata' },
          end: { dateTime: endIso, timeZone: 'Asia/Kolkata' },
          attendees,
        }),
      });

      const data = await response.json();
      console.log('[Google Calendar OAuth] Event rescheduled! Event ID:', data.id);
      return { success: true, eventId: data.id };
    } catch (err) {
      console.error('[Google Calendar OAuth Error] Event update failed:', err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Delete / Cancel Google Calendar Event via OAuth 2.0
   */
  async deleteOAuthCalendarEvent({ eventId }) {
    if (!eventId) return { success: false };
    const token = await getAccessToken();
    if (!token) return { success: false };

    try {
      await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}?sendUpdates=all`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log('[Google Calendar OAuth] Event deleted/cancelled! Event ID:', eventId);
      return { success: true };
    } catch (err) {
      console.error('[Google Calendar OAuth Error] Event deletion failed:', err.message);
      return { success: false, error: err.message };
    }
  },
};

export default calendarService;
