import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Button,
  Box,
  Paper,
  Stack,
  Tabs,
  Tab,
  Card,
  CardContent,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Collapse,
  Alert,
  CircularProgress,
  Divider,
  Autocomplete,
  Avatar,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import AllInclusiveIcon from '@mui/icons-material/AllInclusive';
import { UserContext } from '../UserContext';
import dataService from '../services/dataService';

// Question templates - templates are placeholders that get filled with restaurant/restriction
const QUESTION_TEMPLATES = [
  {
    id: 'can_eat_safely',
    label: 'Can eat safely?',
    template: 'Has anyone with {restriction} eaten safely at {restaurant}?',
    category: 'Safety',
  },
  {
    id: 'what_worked',
    label: 'What worked?',
    template: 'What did you order that worked for {restriction} at {restaurant}?',
    category: 'Recommendations',
  },
  {
    id: 'kitchen_understands',
    label: 'Kitchen understanding',
    template: 'Did the kitchen at {restaurant} understand cross-contact for {restriction}?',
    category: 'Safety',
  },
  {
    id: 'has_allergen_binder',
    label: 'Allergen binder?',
    template: 'Does {restaurant} have an allergen binder or ingredient list?',
    category: 'Information',
  },
  {
    id: 'change_gloves',
    label: 'Changed gloves?',
    template: 'Did staff at {restaurant} change gloves when preparing for {restriction}?',
    category: 'Safety',
  },
  {
    id: 'trust_again',
    label: 'Trust again?',
    template: 'Would you trust {restaurant} again for {restriction}?',
    category: 'Trust',
  },
];

// Status constants
const STATUS_OPEN = 'open';
const STATUS_ANSWERED = 'answered';
const STATUS_EXPIRED = 'expired';

// Tab filter constants
const TAB_ALL = 0;
const TAB_OPEN = 1;
const TAB_ANSWERED = 2;
const TAB_EXPIRED = 3;

// Helper to display person without exposing user IDs
const displayPerson = (isOwn) => (isOwn ? 'You' : 'Table member');

const TableQuestionsScreen = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const { userId, isInitialized } = useContext(UserContext);

  // State
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [tabValue, setTabValue] = useState(TAB_ALL);
  const [expandedQuestions, setExpandedQuestions] = useState({});

  // Ask Question Dialog state
  const [askDialogOpen, setAskDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [restrictionInput, setRestrictionInput] = useState('');
  const [askError, setAskError] = useState('');
  const [askLoading, setAskLoading] = useState(false);

  // Answer Dialog state
  const [answerDialogOpen, setAnswerDialogOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [answerText, setAnswerText] = useState('');
  const [whatOrdered, setWhatOrdered] = useState('');
  const [answerError, setAnswerError] = useState('');
  const [answerLoading, setAnswerLoading] = useState(false);

  // Initialize
  useEffect(() => {
    if (!isInitialized) return;

    if (userId === null || userId === undefined) {
      navigate('/login');
      return;
    }

    fetchData();
  }, [userId, isInitialized, navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API calls once backend endpoints are ready
      // For now, using mock data to demonstrate UI

      // Fetch restaurants for the dropdown
      const restaurantsData = await dataService.listRestaurants();
      setRestaurants(restaurantsData || []);

      // Mock questions data - will be replaced with API call
      // await dataService.getTableQuestions(userId);
      setQuestions([
        {
          id: 1,
          template_id: 'can_eat_safely',
          question_text: 'Has anyone with peanut allergy eaten safely at Il Violino?',
          restaurant_id: 0,
          restaurant_name: 'Il Violino',
          dietary_restriction: 'peanut allergy',
          is_own: true,
          asker_name: 'You',
          status: STATUS_OPEN,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          answers: [],
        },
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter questions based on tab
  const getFilteredQuestions = () => {
    switch (tabValue) {
      case TAB_OPEN:
        return questions.filter((q) => q.status === STATUS_OPEN);
      case TAB_ANSWERED:
        return questions.filter((q) => q.status === STATUS_ANSWERED);
      case TAB_EXPIRED:
        return questions.filter((q) => q.status === STATUS_EXPIRED);
      default:
        return questions;
    }
  };

  // Toggle expand/collapse for question answers
  const toggleExpanded = (questionId) => {
    setExpandedQuestions((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  // Open Ask Question Dialog
  const handleOpenAskDialog = () => {
    setAskDialogOpen(true);
    setSelectedTemplate('');
    setSelectedRestaurant(null);
    setRestrictionInput('');
    setAskError('');
  };

  // Handle Ask Question
  const handleAskQuestion = async () => {
    // Validation
    if (!selectedTemplate) {
      setAskError('Please select a question template');
      return;
    }
    if (!selectedRestaurant) {
      setAskError('Please select a restaurant');
      return;
    }
    if (!restrictionInput.trim()) {
      setAskError('Please enter a dietary restriction');
      return;
    }

    setAskLoading(true);
    setAskError('');

    try {
      // Generate the question text from template
      const template = QUESTION_TEMPLATES.find((t) => t.id === selectedTemplate);
      const questionText = template.template
        .replace('{restaurant}', selectedRestaurant.name)
        .replace('{restriction}', restrictionInput.trim());

      // TODO: Replace with actual API call
      // const result = await dataService.askTableQuestion(
      //   selectedTemplate,
      //   selectedRestaurant.id,
      //   restrictionInput.trim(),
      //   'table_only',
      //   30
      // );

      // Mock success - add to local state
      const newQuestion = {
        id: Date.now(),
        template_id: selectedTemplate,
        question_text: questionText,
        restaurant_id: selectedRestaurant.id,
        restaurant_name: selectedRestaurant.name,
        dietary_restriction: restrictionInput.trim(),
        is_own: true,
        asker_name: 'You',
        status: STATUS_OPEN,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        answers: [],
      };

      setQuestions([newQuestion, ...questions]);
      setAskDialogOpen(false);

      // Show success message
      console.log('Question created successfully');
    } catch (error) {
      console.error('Error creating question:', error);
      setAskError('Failed to post question. Please try again.');
    } finally {
      setAskLoading(false);
    }
  };

  // Open Answer Dialog
  const handleOpenAnswerDialog = (question) => {
    setSelectedQuestion(question);
    setAnswerDialogOpen(true);
    setAnswerText('');
    setWhatOrdered('');
    setAnswerError('');
  };

  // Handle Submit Answer
  const handleSubmitAnswer = async () => {
    if (!answerText.trim()) {
      setAnswerError('Please enter your answer');
      return;
    }

    setAnswerLoading(true);
    setAnswerError('');

    try {
      // TODO: Replace with actual API call
      // const result = await dataService.answerTableQuestion(
      //   selectedQuestion.id,
      //   answerText.trim(),
      //   whatOrdered.trim()
      // );

      // Mock success - update local state
      const updatedQuestions = questions.map((q) => {
        if (q.id === selectedQuestion.id) {
          return {
            ...q,
            status: STATUS_ANSWERED,
            answers: [
              ...(q.answers || []),
              {
                id: Date.now(),
                is_own: true,
                user_name: 'You',
                answer_text: answerText.trim(),
                what_ordered: whatOrdered.trim(),
                helpful_count: 0,
                created_at: new Date().toISOString(),
              },
            ],
          };
        }
        return q;
      });

      setQuestions(updatedQuestions);
      setAnswerDialogOpen(false);
      console.log('Answer submitted successfully');
    } catch (error) {
      console.error('Error submitting answer:', error);
      setAnswerError('Failed to submit answer. Please try again.');
    } finally {
      setAnswerLoading(false);
    }
  };

  // Handle Mark Helpful
  const handleMarkHelpful = async (questionId, answerId) => {
    try {
      // TODO: Replace with actual API call
      // await dataService.markAnswerHelpful(answerId);

      // Mock success - update local state
      const updatedQuestions = questions.map((q) => {
        if (q.id === questionId) {
          return {
            ...q,
            answers: q.answers.map((a) => {
              if (a.id === answerId) {
                return {
                  ...a,
                  helpful_count: (a.helpful_count || 0) + 1,
                };
              }
              return a;
            }),
          };
        }
        return q;
      });

      setQuestions(updatedQuestions);
      console.log('Marked as helpful');
    } catch (error) {
      console.error('Error marking helpful:', error);
    }
  };

  // Get status chip
  const getStatusChip = (status) => {
    switch (status) {
      case STATUS_OPEN:
        return <Chip icon={<HelpOutlineIcon />} label="Open" color="primary" size="small" />;
      case STATUS_ANSWERED:
        return <Chip icon={<CheckCircleIcon />} label="Answered" color="success" size="small" />;
      case STATUS_EXPIRED:
        return (
          <Chip icon={<HourglassEmptyIcon />} label="Expired" color="default" size="small" />
        );
      default:
        return null;
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const filteredQuestions = getFilteredQuestions();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/dashboard')}
          sx={{ mb: 2 }}
        >
          Back to Dashboard
        </Button>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <QuestionAnswerIcon color="primary" sx={{ fontSize: 40 }} />
            <Typography variant="h4" fontWeight={700}>
              Table Questions
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenAskDialog}
            sx={{ fontWeight: 600 }}
          >
            Ask Question
          </Button>
        </Box>

        <Typography variant="body1" color="text.secondary">
          Ask and answer questions about dining experiences with specific dietary restrictions
        </Typography>
      </Box>

      {/* Filter Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          variant={fullScreen ? 'fullWidth' : 'standard'}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<AllInclusiveIcon />} label="All" iconPosition="start" />
          <Tab icon={<HelpOutlineIcon />} label="Open" iconPosition="start" />
          <Tab icon={<CheckCircleIcon />} label="Answered" iconPosition="start" />
          <Tab icon={<HourglassEmptyIcon />} label="Expired" iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Questions List */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filteredQuestions.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <QuestionAnswerIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No questions found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Be the first to ask a question about dining with dietary restrictions
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAskDialog}>
            Ask a Question
          </Button>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {filteredQuestions.map((question) => {
            const isMyQuestion = question.asker_id === userId;
            const answerCount = question.answers?.length || 0;
            const isExpanded = expandedQuestions[question.id];

            return (
              <Card key={question.id} variant="outlined">
                <CardContent>
                  {/* Question Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" fontWeight={600} gutterBottom>
                        {question.question_text}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                          icon={<RestaurantIcon />}
                          label={question.restaurant_name}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={question.dietary_restriction}
                          size="small"
                          color="error"
                          variant="outlined"
                        />
                        {getStatusChip(question.status)}
                      </Box>
                    </Box>
                  </Box>

                  {/* Question Meta */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Asked by {displayPerson(question.is_own)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(question.created_at)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {answerCount} {answerCount === 1 ? 'answer' : 'answers'}
                    </Typography>
                  </Box>

                  <Divider sx={{ mb: 2 }} />

                  {/* Answers Section */}
                  {answerCount > 0 && (
                    <>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          mb: 1,
                        }}
                      >
                        <Typography variant="subtitle2" fontWeight={600}>
                          Answers ({answerCount})
                        </Typography>
                        <IconButton size="small" onClick={() => toggleExpanded(question.id)}>
                          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                      </Box>

                      <Collapse in={isExpanded}>
                        <Stack spacing={2} sx={{ mt: 2 }}>
                          {question.answers.map((answer) => (
                            <Paper key={answer.id} variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                                  {displayPerson(answer.is_own).charAt(0).toUpperCase()}
                                </Avatar>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" fontWeight={600}>
                                    {displayPerson(answer.is_own)}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {formatDate(answer.created_at)}
                                  </Typography>
                                </Box>
                                {isMyQuestion && (
                                  <Button
                                    size="small"
                                    startIcon={<ThumbUpIcon />}
                                    onClick={() => handleMarkHelpful(question.id, answer.id)}
                                  >
                                    Helpful ({answer.helpful_count || 0})
                                  </Button>
                                )}
                              </Box>
                              <Typography variant="body2" sx={{ mb: 1 }}>
                                {answer.answer_text}
                              </Typography>
                              {answer.what_ordered && (
                                <Chip
                                  label={`Ordered: ${answer.what_ordered}`}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                />
                              )}
                            </Paper>
                          ))}
                        </Stack>
                      </Collapse>
                    </>
                  )}

                  {/* Action Button */}
                  {!isMyQuestion && question.status === STATUS_OPEN && (
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<SendIcon />}
                      onClick={() => handleOpenAnswerDialog(question)}
                      sx={{ mt: 2 }}
                    >
                      Answer This Question
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

      {/* Ask Question Dialog */}
      <Dialog
        open={askDialogOpen}
        onClose={() => setAskDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={fullScreen}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <QuestionAnswerIcon color="primary" />
            <Typography variant="h6">Ask a Question</Typography>
          </Box>
          <IconButton onClick={() => setAskDialogOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {askError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setAskError('')}>
              {askError}
            </Alert>
          )}

          <Stack spacing={3}>
            <FormControl fullWidth>
              <InputLabel>Question Template</InputLabel>
              <Select
                value={selectedTemplate}
                label="Question Template"
                onChange={(e) => setSelectedTemplate(e.target.value)}
              >
                {QUESTION_TEMPLATES.map((template) => (
                  <MenuItem key={template.id} value={template.id}>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {template.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {template.template}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Autocomplete
              options={restaurants}
              getOptionLabel={(option) => option.name || ''}
              value={selectedRestaurant}
              onChange={(e, newValue) => setSelectedRestaurant(newValue)}
              renderInput={(params) => <TextField {...params} label="Restaurant" required />}
              renderOption={(props, option) => (
                <li {...props}>
                  <RestaurantIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  {option.name}
                </li>
              )}
            />

            <TextField
              label="Dietary Restriction"
              value={restrictionInput}
              onChange={(e) => setRestrictionInput(e.target.value)}
              placeholder="e.g., peanut allergy, gluten-free"
              fullWidth
              required
              helperText="Specify the allergy or dietary restriction"
            />

            {selectedTemplate && selectedRestaurant && restrictionInput && (
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'primary.50' }}>
                <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                  Preview:
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {QUESTION_TEMPLATES.find((t) => t.id === selectedTemplate)
                    ?.template.replace('{restaurant}', selectedRestaurant.name)
                    .replace('{restriction}', restrictionInput)}
                </Typography>
              </Paper>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAskDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAskQuestion}
            disabled={askLoading || !selectedTemplate || !selectedRestaurant || !restrictionInput}
            startIcon={askLoading ? <CircularProgress size={20} /> : <SendIcon />}
          >
            {askLoading ? 'Posting...' : 'Post Question'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Answer Question Dialog */}
      <Dialog
        open={answerDialogOpen}
        onClose={() => setAnswerDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={fullScreen}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SendIcon color="primary" />
            <Typography variant="h6">Answer Question</Typography>
          </Box>
          <IconButton onClick={() => setAnswerDialogOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {answerError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setAnswerError('')}>
              {answerError}
            </Alert>
          )}

          {selectedQuestion && (
            <Stack spacing={3}>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                  Question:
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {selectedQuestion.question_text}
                </Typography>
              </Paper>

              <TextField
                label="Your Answer"
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                multiline
                rows={4}
                fullWidth
                required
                placeholder="Share your experience..."
              />

              <TextField
                label="What Did You Order? (Optional)"
                value={whatOrdered}
                onChange={(e) => setWhatOrdered(e.target.value)}
                fullWidth
                placeholder="e.g., Grilled Salmon, Garden Salad"
                helperText="Help others by sharing what specific dishes worked for you"
              />
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAnswerDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmitAnswer}
            disabled={answerLoading || !answerText.trim()}
            startIcon={answerLoading ? <CircularProgress size={20} /> : <SendIcon />}
          >
            {answerLoading ? 'Submitting...' : 'Submit Answer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TableQuestionsScreen;
