/**
 * My Table API - React/TypeScript Integration Example
 *
 * TypeScript types and React hooks for My Table API
 */

import { useState, useEffect } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';

// =============================================================================
// TYPESCRIPT TYPES
// =============================================================================

export interface TableConnection {
    connection_id: number;
    user_id: number;
    name: string;
    display_name: string | null;
    photo_url: string | null;
    bio: string | null;
    help_count: number;
    connection_strength: number;
    invited_reason: string;
    created_at: string;
    updated_at: string;
}

export interface Question {
    question_id: number;
    asker_user_id: number;
    template_id: string;
    restaurant_id: number;
    dietary_restriction: string | null;
    visibility: 'table_only' | 'private';
    status: 'open' | 'answered' | 'expired';
    answer_count: number;
    created_at: string;
    expires_at: string;
    is_own: boolean;
}

export interface Answer {
    answer_id: number;
    answerer_user_id: number;
    answer_text: string;
    what_ordered: string | null;
    helpful: boolean;
    created_at: string;
}

export interface SafetySignal {
    signal_id: number;
    user_id: number;
    restaurant_id: number;
    dish_name: string | null;
    restrictions_met: string[];
    what_worked: string | null;
    notes: string | null;
    verification_state: string;
    evidence_type: string;
    confidence: number;
    visibility: 'table_only' | 'private';
    attribution: 'attributed' | 'anonymous';
    created_at: string;
    expires_at: string;
    is_own: boolean;
}

export interface TrustScore {
    id: number;
    restaurant_id: number;
    restriction_type: string;
    trust_score: number;
    signal_count: number;
    confidence_state: string;
    last_signal_at: string | null;
    calculated_at: string;
}

// =============================================================================
// API CLIENT HOOK
// =============================================================================

export function useMyTableAPI() {
    const supabase = useSupabaseClient();
    const user = useUser();
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        if (!user) {
            throw new Error('User not authenticated');
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            throw new Error('No active session');
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
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

    return {
        // Table Connections
        sendInvitation: (inviteeEmail: string, reason: string) =>
            apiRequest('/api/table/invite', {
                method: 'POST',
                body: JSON.stringify({ invitee_email: inviteeEmail, invited_reason: reason }),
            }),

        respondToInvitation: (inviteId: number, action: 'accept' | 'decline' | 'block') =>
            apiRequest(`/api/table/invite/${inviteId}/respond`, {
                method: 'POST',
                body: JSON.stringify({ action }),
            }),

        getConnections: () =>
            apiRequest<{ connections: TableConnection[] }>('/api/table/connections'),

        removeConnection: (connectionId: number) =>
            apiRequest(`/api/table/connections/${connectionId}`, { method: 'DELETE' }),

        // Questions
        askQuestion: (restaurantId: number, templateId: string, options?: any) =>
            apiRequest('/api/table/questions', {
                method: 'POST',
                body: JSON.stringify({
                    restaurant_id: restaurantId,
                    template_id: templateId,
                    ...options,
                }),
            }),

        getQuestions: (filters?: { status?: string; restaurantId?: number }) => {
            const params = new URLSearchParams();
            if (filters?.status) params.append('status', filters.status);
            if (filters?.restaurantId) params.append('restaurant_id', String(filters.restaurantId));
            const query = params.toString() ? `?${params.toString()}` : '';
            return apiRequest<{ questions: Question[] }>(`/api/table/questions${query}`);
        },

        getQuestionDetails: (questionId: number) =>
            apiRequest<Question & { answers: Answer[] }>(`/api/table/questions/${questionId}`),

        answerQuestion: (questionId: number, answerText: string, whatOrdered?: string) =>
            apiRequest(`/api/table/questions/${questionId}/answers`, {
                method: 'POST',
                body: JSON.stringify({ answer_text: answerText, what_ordered: whatOrdered }),
            }),

        markAnswerHelpful: (answerId: number) =>
            apiRequest(`/api/table/answers/${answerId}/mark-helpful`, { method: 'POST' }),

        // Safety Signals
        shareSafetySignal: (restaurantId: number, restrictionsMet: string[], options?: any) =>
            apiRequest('/api/table/signals', {
                method: 'POST',
                body: JSON.stringify({
                    restaurant_id: restaurantId,
                    restrictions_met: JSON.stringify(restrictionsMet),
                    ...options,
                }),
            }),

        getSafetySignals: (filters?: { restaurantId?: number; restrictionType?: string }) => {
            const params = new URLSearchParams();
            if (filters?.restaurantId) params.append('restaurant_id', String(filters.restaurantId));
            if (filters?.restrictionType) params.append('restriction_type', filters.restrictionType);
            const query = params.toString() ? `?${params.toString()}` : '';
            return apiRequest<{ signals: SafetySignal[] }>(`/api/table/signals${query}`);
        },

        getTrustScores: (restaurantId: number) =>
            apiRequest<{ trust_scores: TrustScore[] }>(`/api/table/restaurants/${restaurantId}/trust-scores`),

        // Discovery
        discoverHelpfulPeople: () =>
            apiRequest('/api/table/discovery'),

        // Abuse Reporting
        reportAbuse: (reportType: string, targetType: string, targetId: number, reason: string) => {
            const body: any = { report_type: reportType, target_type: targetType, reason };
            body[`${targetType.replace('_', '')}_id`] = targetId;
            return apiRequest('/api/table/reports', {
                method: 'POST',
                body: JSON.stringify(body),
            });
        },
    };
}

// =============================================================================
// REACT HOOKS
// =============================================================================

/**
 * Hook to fetch and manage table connections
 */
export function useTableConnections() {
    const api = useMyTableAPI();
    const [connections, setConnections] = useState<TableConnection[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadConnections();
    }, []);

    async function loadConnections() {
        try {
            setLoading(true);
            const data = await api.getConnections();
            setConnections(data.connections);
            setError(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return { connections, loading, error, refresh: loadConnections };
}

/**
 * Hook to fetch and manage questions
 */
export function useQuestions(filters?: { status?: string; restaurantId?: number }) {
    const api = useMyTableAPI();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadQuestions();
    }, [filters?.status, filters?.restaurantId]);

    async function loadQuestions() {
        try {
            setLoading(true);
            const data = await api.getQuestions(filters);
            setQuestions(data.questions);
            setError(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return { questions, loading, error, refresh: loadQuestions };
}

/**
 * Hook to fetch restaurant trust scores
 */
export function useTrustScores(restaurantId: number) {
    const api = useMyTableAPI();
    const [trustScores, setTrustScores] = useState<TrustScore[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (restaurantId) {
            loadTrustScores();
        }
    }, [restaurantId]);

    async function loadTrustScores() {
        try {
            setLoading(true);
            const data = await api.getTrustScores(restaurantId);
            setTrustScores(data.trust_scores);
            setError(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return { trustScores, loading, error, refresh: loadTrustScores };
}

// =============================================================================
// EXAMPLE COMPONENTS
// =============================================================================

/**
 * Example: Table Connections List Component
 */
export function TableConnectionsList() {
    const { connections, loading, error, refresh } = useTableConnections();

    if (loading) return <div>Loading connections...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div>
            <h2>My Table ({connections.length}/10)</h2>
            {connections.map(conn => (
                <div key={conn.connection_id}>
                    <img src={conn.photo_url || '/default-avatar.png'} alt={conn.display_name || conn.name} />
                    <h3>{conn.display_name || conn.name}</h3>
                    <p>{conn.bio}</p>
                    <p>Helped you {conn.help_count} times</p>
                    <p>Invited because: {conn.invited_reason}</p>
                </div>
            ))}
        </div>
    );
}

/**
 * Example: Ask Question Form Component
 */
export function AskQuestionForm({ restaurantId }: { restaurantId: number }) {
    const api = useMyTableAPI();
    const [templateId, setTemplateId] = useState('can_eat_safely');
    const [dietaryRestriction, setDietaryRestriction] = useState('');
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        try {
            setSubmitting(true);
            await api.askQuestion(restaurantId, templateId, { dietary_restriction: dietaryRestriction });
            alert('Question posted to your table!');
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <select value={templateId} onChange={e => setTemplateId(e.target.value)}>
                <option value="can_eat_safely">Can I eat safely?</option>
                <option value="what_worked">What worked?</option>
                <option value="kitchen_understands">Kitchen understands?</option>
            </select>
            <input
                type="text"
                placeholder="Dietary restriction (e.g., gluten_free)"
                value={dietaryRestriction}
                onChange={e => setDietaryRestriction(e.target.value)}
            />
            <button type="submit" disabled={submitting}>
                {submitting ? 'Posting...' : 'Ask Your Table'}
            </button>
        </form>
    );
}

/**
 * Example: Trust Score Display Component
 */
export function TrustScoreDisplay({ restaurantId }: { restaurantId: number }) {
    const { trustScores, loading, error } = useTrustScores(restaurantId);

    if (loading) return <div>Loading trust scores...</div>;
    if (error) return <div>Error: {error}</div>;
    if (trustScores.length === 0) return <div>No trust data yet</div>;

    return (
        <div>
            <h3>Trust Indicators</h3>
            {trustScores.map(score => (
                <div key={score.id}>
                    <h4>{score.restriction_type.replace('_', ' ')}</h4>
                    <div className="trust-bar" style={{ width: `${score.trust_score * 100}%` }} />
                    <p>{(score.trust_score * 100).toFixed(0)}% trusted</p>
                    <p>{score.signal_count} signals • {score.confidence_state}</p>
                </div>
            ))}
        </div>
    );
}
