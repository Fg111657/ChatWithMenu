/**
 * My Table API - Frontend Integration Example
 *
 * This file provides ready-to-use JavaScript code for integrating
 * the My Table API into your frontend application.
 *
 * Requirements:
 * - Supabase authentication configured
 * - JWT token available from Supabase session
 */

// =============================================================================
// API CLIENT CONFIGURATION
// =============================================================================

const API_BASE_URL = 'http://localhost:5000';  // Change to your production URL

/**
 * Get JWT token from Supabase session
 */
async function getAuthToken() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        throw new Error('User not authenticated');
    }
    return session.access_token;
}

/**
 * Generic API request helper
 */
async function apiRequest(endpoint, options = {}) {
    const token = await getAuthToken();

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
}

// =============================================================================
// TABLE CONNECTIONS (Phase 2)
// =============================================================================

/**
 * Send a table invitation
 */
async function sendTableInvitation(inviteeEmail, reason) {
    return apiRequest('/api/table/invite', {
        method: 'POST',
        body: JSON.stringify({
            invitee_email: inviteeEmail,
            invited_reason: reason,  // Min 20 characters
        }),
    });
}

/**
 * Respond to a table invitation
 */
async function respondToInvitation(inviteId, action) {
    // action: 'accept', 'decline', or 'block'
    return apiRequest(`/api/table/invite/${inviteId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ action }),
    });
}

/**
 * List my table connections
 */
async function getMyTableConnections() {
    return apiRequest('/api/table/connections');
}

/**
 * Remove a table member
 */
async function removeTableMember(connectionId) {
    return apiRequest(`/api/table/connections/${connectionId}`, {
        method: 'DELETE',
    });
}

// =============================================================================
// QUESTIONS & ANSWERS (Phase 3)
// =============================================================================

/**
 * Ask a question to your table
 */
async function askQuestion(restaurantId, templateId, options = {}) {
    return apiRequest('/api/table/questions', {
        method: 'POST',
        body: JSON.stringify({
            restaurant_id: restaurantId,
            template_id: templateId,  // e.g., 'can_eat_safely'
            dietary_restriction: options.dietaryRestriction,
            visibility: options.visibility || 'table_only',
            expire_days: options.expireDays || 30,
        }),
    });
}

/**
 * List questions (own + table members')
 */
async function getQuestions(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.restaurantId) params.append('restaurant_id', filters.restaurantId);

    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest(`/api/table/questions${query}`);
}

/**
 * Get question details with all answers
 */
async function getQuestionDetails(questionId) {
    return apiRequest(`/api/table/questions/${questionId}`);
}

/**
 * Answer a question
 */
async function answerQuestion(questionId, answerText, whatOrdered = null) {
    return apiRequest(`/api/table/questions/${questionId}/answers`, {
        method: 'POST',
        body: JSON.stringify({
            answer_text: answerText,
            what_ordered: whatOrdered,
        }),
    });
}

/**
 * Mark an answer as helpful (asker only)
 */
async function markAnswerHelpful(answerId) {
    return apiRequest(`/api/table/answers/${answerId}/mark-helpful`, {
        method: 'POST',
    });
}

/**
 * Update question status
 */
async function updateQuestionStatus(questionId, status) {
    // status: 'open', 'answered', or 'expired'
    return apiRequest(`/api/table/questions/${questionId}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
    });
}

/**
 * Delete a question (soft delete)
 */
async function deleteQuestion(questionId) {
    return apiRequest(`/api/table/questions/${questionId}`, {
        method: 'DELETE',
    });
}

// =============================================================================
// SAFETY SIGNALS (Phase 4)
// =============================================================================

/**
 * Share a safety signal
 */
async function shareSafetySignal(restaurantId, restrictions, options = {}) {
    return apiRequest('/api/table/signals', {
        method: 'POST',
        body: JSON.stringify({
            restaurant_id: restaurantId,
            restrictions_met: JSON.stringify(restrictions),  // e.g., ["gluten_free", "dairy_free"]
            dish_name: options.dishName,
            what_worked: options.whatWorked,  // e.g., 'changed_gloves'
            notes: options.notes,
            verification_state: options.verificationState || 'unverified',
            evidence_type: options.evidenceType || 'user_experience',
            confidence: options.confidence || 5,  // 1-5
            visibility: options.visibility || 'table_only',
            attribution: options.attribution || 'attributed',
        }),
    });
}

/**
 * Get safety signals
 */
async function getSafetySignals(filters = {}) {
    const params = new URLSearchParams();
    if (filters.restaurantId) params.append('restaurant_id', filters.restaurantId);
    if (filters.restrictionType) params.append('restriction_type', filters.restrictionType);

    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest(`/api/table/signals${query}`);
}

/**
 * Get trust scores for a restaurant
 */
async function getRestaurantTrustScores(restaurantId) {
    return apiRequest(`/api/table/restaurants/${restaurantId}/trust-scores`);
}

// =============================================================================
// DISCOVERY & ABUSE PREVENTION (Phase 5)
// =============================================================================

/**
 * Discover helpful people to invite to your table
 */
async function discoverHelpfulPeople() {
    return apiRequest('/api/table/discovery');
}

/**
 * Report abuse
 */
async function reportAbuse(reportType, targetType, targetId, reason) {
    const body = {
        report_type: reportType,  // 'spam', 'inappropriate', 'unsafe_advice', 'harassment'
        target_type: targetType,  // 'table_member', 'question', 'answer', 'signal'
        reason: reason,
    };

    // Add the appropriate target ID field
    const targetIdField = `${targetType.replace('_', '')}_id`;
    body[targetIdField] = targetId;

    return apiRequest('/api/table/reports', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

/**
 * Get abuse reports (admin only)
 */
async function getAbuseReports(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.reportType) params.append('report_type', filters.reportType);

    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest(`/api/table/reports${query}`);
}

// =============================================================================
// EXAMPLE USAGE
// =============================================================================

/**
 * Example: Complete flow for asking and answering a question
 */
async function exampleQuestionFlow() {
    try {
        // 1. Ask a question
        const question = await askQuestion(
            123,  // restaurant_id
            'can_eat_safely',
            { dietaryRestriction: 'gluten_free' }
        );
        console.log('Question created:', question);

        // 2. List questions to see it
        const questions = await getQuestions({ status: 'open' });
        console.log('Open questions:', questions);

        // 3. Answer the question (different user)
        const answer = await answerQuestion(
            question.question_id,
            'Yes, I ate there safely! They have a dedicated gluten-free menu.',
            'Gluten-free pasta with marinara'
        );
        console.log('Answer created:', answer);

        // 4. Mark answer as helpful (original asker)
        const helpful = await markAnswerHelpful(answer.answer_id);
        console.log('Marked helpful:', helpful);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

/**
 * Example: Share a safety signal after dining
 */
async function exampleSafetySignal() {
    try {
        const signal = await shareSafetySignal(
            123,  // restaurant_id
            ['gluten_free', 'dairy_free'],
            {
                dishName: 'Grilled chicken with vegetables',
                whatWorked: 'changed_gloves',
                notes: 'Staff was very knowledgeable about cross-contact',
                verificationState: 'staff_verified',
                confidence: 5,
            }
        );
        console.log('Safety signal shared:', signal);

        // Get trust scores for the restaurant
        const trustScores = await getRestaurantTrustScores(123);
        console.log('Trust scores:', trustScores);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

// =============================================================================
// EXPORT FOR MODULE USAGE
// =============================================================================

export {
    // Table Connections
    sendTableInvitation,
    respondToInvitation,
    getMyTableConnections,
    removeTableMember,

    // Questions & Answers
    askQuestion,
    getQuestions,
    getQuestionDetails,
    answerQuestion,
    markAnswerHelpful,
    updateQuestionStatus,
    deleteQuestion,

    // Safety Signals
    shareSafetySignal,
    getSafetySignals,
    getRestaurantTrustScores,

    // Discovery & Abuse
    discoverHelpfulPeople,
    reportAbuse,
    getAbuseReports,
};
