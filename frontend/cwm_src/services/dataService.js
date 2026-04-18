import { BASE_URL } from "./backendData";
import { supabase } from './supabaseClient';

// Helper function for consistent error handling
const handleResponse = async (response) => {
  if (!response.ok) {
    let errorMessage;
    try {
      const error = await response.json();
      errorMessage = error.message || error.error || `HTTP ${response.status}`;
    } catch {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }
  return response.json();
};

const loadUserData = async (userId) => {
  const response = await fetch(`${BASE_URL}/loadUser/${userId}`);
  const userData = await response.json();
  return userData;
};

const modifyUserData = async (userId, user_data) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error('Not authenticated. Please log in.');
  }

  const response = await fetch(`${BASE_URL}/modifyUser/${userId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ user_data }),
  });

  return await handleResponse(response);
};


const listRestaurants = async () => {
  // Fetch all restaurants with sequential pagination (CPU-safe)
  // Backend caps per_page at 50, so we request max and paginate if needed

  let allRestaurants = [];
  let page = 1;
  const perPage = 50; // Backend max
  const safetyCap = 20; // Safety limit only if no metadata (1000 restaurants max)

  while (true) {
    const response = await fetch(`${BASE_URL}/listRestaurants?page=${page}&per_page=${perPage}`);
    const data = await response.json();

    let restaurants = [];
    let totalPages = null;

    // Backend may return {restaurants: [...], total, page, per_page} - extract the array
    if (data && data.restaurants && Array.isArray(data.restaurants)) {
      restaurants = data.restaurants;

      // Compute total pages from metadata if available
      if (data.total && data.per_page) {
        totalPages = Math.ceil(data.total / data.per_page);
      }
    }
    // Fallback: if backend returns plain array (legacy)
    else if (Array.isArray(data)) {
      restaurants = data;
    }

    // Add to our collection
    if (restaurants.length > 0) {
      allRestaurants = allRestaurants.concat(restaurants);
    }

    // Stop conditions (in priority order):
    // 1. If we have metadata: stop when we've fetched all pages
    if (totalPages !== null && page >= totalPages) {
      break;
    }
    // 2. No restaurants returned (end of data)
    if (restaurants.length === 0) {
      break;
    }
    // 3. Returned less than perPage (last page)
    if (restaurants.length < perPage) {
      break;
    }
    // 4. Safety cap only if metadata is missing (prevents infinite loop)
    if (totalPages === null && page >= safetyCap) {
      break;
    }

    page++;
  }

  return allRestaurants;
};

// Search restaurants with filters, sorting, and pagination
const searchRestaurants = async (filters = {}) => {
  const params = new URLSearchParams();

  if (filters.search) params.append('search', filters.search);
  if (filters.cuisine && filters.cuisine !== 'all') params.append('cuisine', filters.cuisine);
  if (filters.dietary && filters.dietary.length > 0) {
    params.append('dietary', filters.dietary.join(','));
  }
  if (filters.sort) params.append('sort', filters.sort);
  if (filters.page) params.append('page', filters.page);
  if (filters.per_page) params.append('per_page', filters.per_page);

  const response = await fetch(`${BASE_URL}/listRestaurants?${params.toString()}`);
  const data = await response.json();

  // API returns plain array, wrap it in expected format
  if (Array.isArray(data)) {
    return {
      restaurants: data,
      total: data.length,
      total_pages: 1
    };
  }

  return data;
};

// Get detailed restaurant information including menus, stats, and reviews
const getRestaurantDetails = async (restaurantId) => {
  // Use the base restaurant endpoint
  const response = await fetch(`${BASE_URL}/restaurant/${restaurantId}`);
  const data = await response.json();

  // Parse menu_data JSON strings into objects
  const parsedMenus = (data.menus || []).map(menu => {
    let menuData = null;
    if (menu.menu_data) {
      try {
        menuData = typeof menu.menu_data === 'string'
          ? JSON.parse(menu.menu_data)
          : menu.menu_data;
      } catch (e) {
        console.error('Failed to parse menu_data:', e);
        menuData = null;
      }
    }
    return {
      id: menu.id,
      menu_data: menuData
    };
  });

  // Transform backend response to match expected format
  return {
    restaurant: {
      ...(data.restaurant || {}),
      dietary_tags: data?.restaurant?.dietary_tags || '[]',
      dietary_display_tags: data?.restaurant?.dietary_display_tags || [],
      card_tags: data?.restaurant?.card_tags || [],
    },
    menus: parsedMenus,
    documents: data.documents || [],
    stats: {
      avg_rating: data?.restaurant?.rating_aggregate || 0,
      review_count: data?.restaurant?.review_count || 0
    },
    recent_reviews: [] // Not in backend response
  };
};

const startChat = async (user_id, restaurant_id, force_new) => {
  user_id = parseInt(user_id, 10);
  restaurant_id = parseInt(restaurant_id, 10);

  const response = await fetch(`${BASE_URL}/startChat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_id, restaurant_id, force_new }),
  });
  return await handleResponse(response);
}

const sendMessage = async (chat_id, message) => {
  const response = await fetch(`${BASE_URL}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ chat_id, message })
  });
  return await handleResponse(response);
}

const submitReview = async (user_id, restaurant_id, chat_id, item, rating, review_text) => {
  const response = await fetch(`${BASE_URL}/submitReview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_id, restaurant_id, chat_id, item, rating, review_text })
  });
  return await handleResponse(response);
}

const loadUserPreferences = async (user_id, restrictionType) => {
  const response = await fetch(`${BASE_URL}/loadUserPreferences/${user_id}/${restrictionType}`);
  const data = await response.json();
  return data;
}

const saveUserPreferences = async (user_id, dietary_restrictions, restrictionType) => {
  const response = await fetch(`${BASE_URL}/saveUserPreferences/${user_id}/${restrictionType}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ dietary_restrictions })
  });
  const data = await response.json();
  return data;
}

const saveUserPrefrencesAudio = async (user_id, audioBlob) => {
  const formData = new FormData();
  console.log("Received audio blob", audioBlob);
  formData.append('audio_file', audioBlob)
  console.log("formData", formData)
  const response = await fetch(`${BASE_URL}/saveUserPreferencesAudio/${user_id}`, {
    method: 'POST',
    body: formData,
  });
  const data = await response.json();
  return data;
}

const listUserRestaurantReviews = async (user_id, restaurant_id) => {
  const response = await fetch(`${BASE_URL}/reviews/${user_id}/${restaurant_id}`)
  const data = await response.json();
  return data; 
}

const editUserRestaurantReviews = async (user_id, restaurant_id, reviews) => {
  const response = await fetch(`${BASE_URL}/reviews/${user_id}/${restaurant_id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reviews })
  });
  const data = await response.json(); 
  return data;
}

const genImageDish = async(restaurantId, dishName) => {
  const response = await fetch(`${BASE_URL}/imagegen/dish/${restaurantId}/${dishName}`)
  const data = await response.json();
  return data;
}

const menuItemsFromChat = async(chatId) => {
  const response = await fetch(`${BASE_URL}/chat/${chatId}/menu_items`)
  return await handleResponse(response);
}

const createRestaurant = async(restaurantData) => {
  const response = await fetch(`${BASE_URL}/restaurant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(restaurantData)
  });
  const data = await response.json(); 
  return data;
}

const deleteRestaurant = async (userId, restaurantId) => {
  const response = await fetch(`${BASE_URL}/restaurant/${restaurantId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({user_id: userId})
  });
  const data = await response.json();
  return data;
};

// Get full restaurant data including menus and documents
const getRestaurant = async (restaurantId) => {
  const response = await fetch(`${BASE_URL}/restaurant/${restaurantId}`);
  const data = await response.json();
  return data;
};

// Update restaurant profile (name, address, description)
const updateRestaurant = async (restaurantId, updates, userId) => {
  const response = await fetch(`${BASE_URL}/restaurant/${restaurantId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...updates, user_id: userId })
  });
  const data = await response.json();
  return data;
};

// Update a specific menu's data
const updateRestaurantMenu = async (restaurantId, menuId, menuData) => {
  const response = await fetch(`${BASE_URL}/restaurant/${restaurantId}/menu/${menuId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ document_data: { menu_data: menuData } })
  });
  const data = await response.json();
  return data;
};

// Add a new menu to restaurant
const addRestaurantMenu = async (restaurantId, menuData) => {
  const response = await fetch(`${BASE_URL}/restaurant/${restaurantId}/menu`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ restaurant_id: restaurantId, menu_data: menuData })
  });
  const data = await response.json();
  return data;
};

// ============================================================================
// FAMILY MANAGEMENT
// ============================================================================

const getFamilyMembers = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error('Not authenticated. Please log in.');
  }

  const response = await fetch(`${BASE_URL}/family/members`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  const data = await handleResponse(response);
  return Array.isArray(data) ? data : (data.members || []); // Extract members array from response
};

const addFamilyMember = async (memberData) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error('Not authenticated. Please log in.');
  }

  const response = await fetch(`${BASE_URL}/family/members`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(memberData),
  });

  return await handleResponse(response);
};

const updateFamilyMember = async (memberId, updates) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error('Not authenticated. Please log in.');
  }

  const response = await fetch(`${BASE_URL}/family/members/${memberId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(updates),
  });

  return await handleResponse(response);
};

const deleteFamilyMember = async (memberId) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error('Not authenticated. Please log in.');
  }

  const response = await fetch(`${BASE_URL}/family/members/${memberId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  return await handleResponse(response);
};

const addFamilyMemberAllergy = async (memberId, allergyData) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error('Not authenticated. Please log in.');
  }

  const response = await fetch(`${BASE_URL}/family/members/${memberId}/allergies`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(allergyData),
  });

  return await handleResponse(response);
};

const deleteFamilyMemberAllergy = async (allergyId) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error('Not authenticated. Please log in.');
  }

  const response = await fetch(`${BASE_URL}/family/allergies/${allergyId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  return await handleResponse(response);
};

// ============================================================================
// GOOGLE PLACES DATA
// ============================================================================

// PUBLIC: Get cached Google data (no auth required, no API calls)
const getGoogleCachedData = async (restaurantId) => {
  const response = await fetch(`${BASE_URL}/restaurant/${restaurantId}/google_cached`);
  return await handleResponse(response);
};

// PROTECTED: Trigger Google enrichment (auth required, can call Google API)
const enrichRestaurantWithGoogle = async (restaurantId, force = false) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error('Not authenticated. Please log in.');
  }

  const response = await fetch(`${BASE_URL}/restaurant/${restaurantId}/enrich_google?force=${force ? '1' : '0'}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  return await handleResponse(response);
};

// ============================================================================
// MY TABLE API - TABLE CONNECTIONS
// ============================================================================

// Send a table invitation (2-way handshake required)
const sendTableInvite = async (inviteeUserId, invitedReason) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error('Not authenticated. Please log in.');
  }

  const response = await fetch(`${BASE_URL}/table/invite`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      invitee_user_id: inviteeUserId,
      invited_reason: invitedReason
    }),
  });

  return await handleResponse(response);
};

// Respond to a table invitation (accept/decline/block)
const respondToInvite = async (inviteId, action) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error('Not authenticated. Please log in.');
  }

  const response = await fetch(`${BASE_URL}/table/invite/${inviteId}/respond`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ action }),
  });

  return await handleResponse(response);
};

// List all accepted table connections
const getTableConnections = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error('Not authenticated. Please log in.');
  }

  const response = await fetch(`${BASE_URL}/table/connections`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  const data = await handleResponse(response);
  return data.connections || []; // Extract connections array from response
};

// Remove a table connection
const removeTableConnection = async (connectionId) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error('Not authenticated. Please log in.');
  }

  const response = await fetch(`${BASE_URL}/table/connections/${connectionId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  return await handleResponse(response);
};

// ============================================================================
// MY TABLE API - QUESTIONS & ANSWERS
// ============================================================================

// Ask a structured question to your table
const askTableQuestion = async (templateId, restaurantId, dietaryRestriction = null, visibility = 'table_only', expireDays = 30) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error('Not authenticated. Please log in.');
  }

  const body = {
    template_id: templateId,
    restaurant_id: restaurantId,
    visibility,
    expire_days: expireDays
  };

  if (dietaryRestriction) {
    body.dietary_restriction = dietaryRestriction;
  }

  const response = await fetch(`${BASE_URL}/table/questions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(body),
  });

  return await handleResponse(response);
};

// List questions visible to the current user
const getTableQuestions = async (status = null, restaurantId = null) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error('Not authenticated. Please log in.');
  }

  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (restaurantId) params.append('restaurant_id', restaurantId);

  const queryString = params.toString();
  const url = `${BASE_URL}/table/questions${queryString ? '?' + queryString : ''}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  const data = await handleResponse(response);
  return data.questions || []; // Extract questions array from response
};

// Get a specific question with all answers
const getTableQuestion = async (questionId) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error('Not authenticated. Please log in.');
  }

  const response = await fetch(`${BASE_URL}/table/questions/${questionId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  return await handleResponse(response);
};

// Update question status (mark as answered/expired)
const updateTableQuestion = async (questionId, status) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error('Not authenticated. Please log in.');
  }

  const response = await fetch(`${BASE_URL}/table/questions/${questionId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ status }),
  });

  return await handleResponse(response);
};

// Delete a question (soft delete - marks as expired)
const deleteTableQuestion = async (questionId) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error('Not authenticated. Please log in.');
  }

  const response = await fetch(`${BASE_URL}/table/questions/${questionId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  return await handleResponse(response);
};

// Answer a question from your table
const answerTableQuestion = async (questionId, answerText, whatOrdered = null) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error('Not authenticated. Please log in.');
  }

  const body = { answer_text: answerText };
  if (whatOrdered) {
    body.what_ordered = whatOrdered;
  }

  const response = await fetch(`${BASE_URL}/table/questions/${questionId}/answers`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(body),
  });

  return await handleResponse(response);
};

// Mark an answer as helpful (asker-only, idempotent)
const markAnswerHelpful = async (answerId) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error('Not authenticated. Please log in.');
  }

  const response = await fetch(`${BASE_URL}/table/answers/${answerId}/mark-helpful`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  return await handleResponse(response);
};

// ============================================================================
// MY TABLE API - SAFETY SIGNALS & TRUST SCORES
// ============================================================================

// Create a safety signal ("ate safely" report)
const createSafetySignal = async (
  restaurantId,
  restrictionsMet,
  dishName = null,
  whatWorked = null,
  notes = null,
  verificationState = 'unverified',
  evidenceType = 'user_experience',
  confidence = 5,
  visibility = 'table_only',
  attribution = 'attributed'
) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error('Not authenticated. Please log in.');
  }

  const body = {
    restaurant_id: restaurantId,
    restrictions_met: restrictionsMet,
    verification_state: verificationState,
    evidence_type: evidenceType,
    confidence,
    visibility,
    attribution
  };

  if (dishName) body.dish_name = dishName;
  if (whatWorked) body.what_worked = whatWorked;
  if (notes) body.notes = notes;

  const response = await fetch(`${BASE_URL}/table/signals`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(body),
  });

  return await handleResponse(response);
};

// List safety signals visible to the current user
const getSafetySignals = async (restaurantId = null, restrictionType = null) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error('Not authenticated. Please log in.');
  }

  const params = new URLSearchParams();
  if (restaurantId) params.append('restaurant_id', restaurantId);
  if (restrictionType) params.append('restriction_type', restrictionType);

  const queryString = params.toString();
  const url = `${BASE_URL}/table/signals${queryString ? '?' + queryString : ''}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  const data = await handleResponse(response);
  return data.signals || []; // Extract signals array from response
};

// Get trust scores for a restaurant by restriction type (My Table API)
const getRestaurantTrustScores = async (restaurantId) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error('Not authenticated. Please log in.');
  }

  const response = await fetch(`${BASE_URL}/table/restaurants/${restaurantId}/trust-scores`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  const data = await handleResponse(response);
  return data.trust_scores || []; // Extract trust_scores array from response
};

// ============================================================================
// MY TABLE API - DISCOVERY & ABUSE PREVENTION
// ============================================================================

// Discover helpful people based on past interactions
const getTableDiscovery = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error('Not authenticated. Please log in.');
  }

  const response = await fetch(`${BASE_URL}/table/discovery`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  const data = await handleResponse(response);
  return data.suggestions || []; // Extract suggestions array from response
};

// Report abuse (spam, inappropriate content, unsafe advice, harassment)
const reportAbuse = async (reportType, targetType, targetId, reason) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error('Not authenticated. Please log in.');
  }

  const body = {
    report_type: reportType,
    target_type: targetType,
    reason
  };

  // Add the appropriate target ID field based on target type
  if (targetType === 'table_member') {
    body.table_member_id = targetId;
  } else if (targetType === 'question') {
    body.question_id = targetId;
  } else if (targetType === 'answer') {
    body.answer_id = targetId;
  } else if (targetType === 'signal') {
    body.signal_id = targetId;
  }

  const response = await fetch(`${BASE_URL}/table/reports`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(body),
  });

  return await handleResponse(response);
};

const dataService = {
  loadUserData,
  modifyUserData,
  listRestaurants,
  searchRestaurants,
  getRestaurantDetails,
  startChat,
  sendMessage,
  loadUserPreferences,
  saveUserPreferences,
  submitReview,
  saveUserPrefrencesAudio,
  listUserRestaurantReviews,
  editUserRestaurantReviews,
  genImageDish,
  menuItemsFromChat,
  createRestaurant,
  deleteRestaurant,
  getRestaurant,
  updateRestaurant,
  updateRestaurantMenu,
  addRestaurantMenu,
  // Family management
  getFamilyMembers,
  addFamilyMember,
  updateFamilyMember,
  deleteFamilyMember,
  addFamilyMemberAllergy,
  deleteFamilyMemberAllergy,
  // Google Places data
  getGoogleCachedData,
  enrichRestaurantWithGoogle,
  // My Table - Table Connections
  sendTableInvite,
  respondToInvite,
  getTableConnections,
  removeTableConnection,
  // My Table - Questions & Answers
  askTableQuestion,
  getTableQuestions,
  getTableQuestion,
  updateTableQuestion,
  deleteTableQuestion,
  answerTableQuestion,
  markAnswerHelpful,
  // My Table - Safety Signals & Trust Scores
  createSafetySignal,
  getSafetySignals,
  getRestaurantTrustScores,
  // My Table - Discovery & Abuse Prevention
  getTableDiscovery,
  reportAbuse,
  // My Table - Compatibility Aliases (for MyTableScreen)
  sendMyTableInvite: sendTableInvite,
  getMyTableConnections: getTableConnections,
  getMyTableInvites: async () => [], // Backend doesn't have pending invites endpoint yet
  getMyTableSuggestions: getTableDiscovery, // Maps to discovery
  acceptMyTableInvite: (inviteId) => respondToInvite(inviteId, 'accept'),
  declineMyTableInvite: (inviteId) => respondToInvite(inviteId, 'decline'),
};

export default dataService;
