// services/aiService.js - MotionSync AI Assistant
const GEMINI_API_KEY = 'AIzaSyB_cKizBwtP55LTWXib7WLGMfKoHjUpyZg';

// ✅ Using Gemini 1.5 Flash for MotionSync assistance
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const BASE_PROMPT = `You are MotionSync AI, the intelligent assistant for MotionSync - an advanced motion analysis and fitness tracking platform that uses computer vision to analyze movement patterns and provide form corrections.

Core capabilities:
- Real-time exercise form analysis
- Movement quality scoring
- Camera setup guidance
- Exercise technique improvement
- Performance tracking

CRITICAL: Always follow the specific response length guidance provided. This is essential for user experience.

Key principles:
- MotionSync is AI-assisted fitness tool, not medical equipment
- Focus on form quality and safety
- Provide actionable, specific advice
- Reference MotionSync's computer vision when relevant`;

class AIService {
  static async sendMessage(userMessage, userData = null, userActions = []) {
    try {
      console.log('🚀 Sending message to Gemini 1.5 Flash:', userMessage);
      
      // Analyze message type and determine appropriate response length
      const messageAnalysis = this.analyzeMessage(userMessage);
      const responseLength = this.getResponseLength(messageAnalysis);
      
      // Build contextual prompt with MotionSync data
      let contextualPrompt = BASE_PROMPT;
      
      // Add response length guidance based on message type
      contextualPrompt += `\n\n**RESPONSE LENGTH REQUIREMENT: ${responseLength.instruction}**\nIMPORTANT: You MUST follow this length requirement exactly. Do not exceed the specified length.`;
      
      if (userData) {
        contextualPrompt += `\n\nUser Profile:
- Name: ${userData.name}
- Fitness Level: ${userData.level || 'Beginner'} (Level ${userData.currentLevel || 1})
- Experience Points: ${userData.xp || 0} XP
- Movement Analysis Sessions: ${userData.sessionsCompleted || 0}
- Current Focus: ${userData.goals || 'General fitness and form improvement'}
- Recent Motion Quality Score: ${userData.lastMotionScore || 'Not available'}`;

        // Add recent activity context
        if (userActions && userActions.length > 0) {
          const recentActivities = userActions.slice(-3);
          contextualPrompt += `\n- Recent Activities: ${recentActivities.map(a => a.type || a.exercise || a.name).join(', ')}`;
          
          // Add motion analysis context if available
          const motionData = userActions.filter(a => a.motionScore || a.formFeedback);
          if (motionData.length > 0) {
            contextualPrompt += `\n- Recent Form Analysis: ${motionData.length} exercises analyzed`;
          }
        }
      }

      const requestBody = {
        contents: [{
          parts: [{
            text: `${contextualPrompt}\n\nUser Question: ${userMessage}`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: responseLength.maxTokens,
          stopSequences: responseLength.type === 'greeting' || responseLength.type === 'acknowledgment' ? ['\n\n', '.', '!'] : undefined,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH", 
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      };

      console.log('📤 Using URL:', GEMINI_URL);
      console.log('📏 Response length strategy:', messageAnalysis.type, '-', responseLength.description);

      const response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Detailed API error:', errorText);
        
        // Parse error for better handling
        let errorObj;
        try {
          errorObj = JSON.parse(errorText);
        } catch (e) {
          errorObj = { message: errorText };
        }
        
        if (response.status === 400) {
          throw new Error(`Invalid request: ${errorObj.error?.message || errorText}`);
        } else if (response.status === 403) {
          throw new Error('Invalid API key or access denied');
        } else if (response.status === 404) {
          throw new Error('Model not found - Check API version');
        } else if (response.status === 429) {
          throw new Error('Too many requests - Wait a few seconds');
        } else {
          throw new Error(`API Error ${response.status}: ${errorObj.error?.message || errorText}`);
        }
      }

      const data = await response.json();
      console.log('✅ Full API response:', JSON.stringify(data, null, 2));
      
      if (!data.candidates || data.candidates.length === 0) {
        console.error('❌ No candidates in response');
        throw new Error('No response generated by AI');
      }

      const candidate = data.candidates[0];
      
      // Check if response was blocked for safety reasons
      if (candidate.finishReason === 'SAFETY') {
        throw new Error('Response blocked for safety reasons');
      }

      const aiResponse = candidate.content?.parts?.[0]?.text;
      
      if (!aiResponse) {
        console.error('❌ No text in response:', candidate);
        throw new Error('Empty AI response');
      }

      console.log('✅ AI Response:', aiResponse);

      return {
        success: true,
        message: aiResponse.trim(),
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      console.error('💥 Error in AIService:', error);
      
      // More specific error messages for MotionSync context
      let errorMessage = '🤖 Sorry, I\'m experiencing technical difficulties.';
      
      if (error.message.includes('Network request failed') || error.message.includes('fetch')) {
        errorMessage = '🌐 Connection issue. Please check your internet connection.';
      } else if (error.message.includes('403') || error.message.includes('API key')) {
        errorMessage = '🔑 API configuration issue. Please contact support.';
      } else if (error.message.includes('429')) {
        errorMessage = '⏰ Too many messages sent. Please wait a moment.';
      } else if (error.message.includes('400') || error.message.includes('Invalid request')) {
        errorMessage = '📝 Invalid message format. Try rephrasing your question.';
      } else if (error.message.includes('404') || error.message.includes('Model not found')) {
        errorMessage = '🔧 AI model configuration issue. Please contact support.';
      } else if (error.message.includes('quota')) {
        errorMessage = '📊 Daily AI quota exceeded. Try again tomorrow.';
      }
      
      return {
        success: false,
        message: errorMessage,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Analyze message type and complexity
  static analyzeMessage(message) {
    const lowerMessage = message.toLowerCase().trim();
    const wordCount = message.split(/\s+/).length;
    
    // Greeting patterns
    const greetingPatterns = [
      /^(hi|hello|hey|good morning|good afternoon|good evening|what's up|whats up|sup)$/i,
      /^(hi there|hello there|hey there|how are you|how's it going|hows it going)$/i,
      /^(good day|greetings|howdy)$/i
    ];
    
    // Simple acknowledgment patterns
    const acknowledgmentPatterns = [
      /^(ok|okay|thanks|thank you|got it|alright|cool|nice)$/i,
      /^(yes|yeah|yep|no|nope|sure)$/i,
      /^(bye|goodbye|see you|later|talk later)$/i
    ];
    
    // Question patterns that need detailed responses
    const complexQuestionPatterns = [
      /\b(how to|how do|how can|what is|what are|explain|describe|tell me about)\b/i,
      /\b(why|when|where|which|what if|can you)\b/i,
      /\b(help me|guide me|show me|teach me)\b/i,
      /\b(difference|compare|better|best|recommend|suggest)\b/i,
      /\?(.*?)why|how|what|when|where/i // Questions with question words
    ];
    
    // Technical/detailed request patterns
    const technicalPatterns = [
      /\b(setup|configure|optimize|analyze|analysis|technique|form|posture)\b/i,
      /\b(workout|exercise|training|program|plan|routine)\b/i,
      /\b(score|rating|feedback|improvement|correction)\b/i,
      /\b(camera|motion|tracking|detection|confidence)\b/i
    ];
    
    // Problem/troubleshooting patterns
    const problemPatterns = [
      /\b(problem|issue|error|trouble|difficulty|not working|doesn't work)\b/i,
      /\b(fix|solve|resolve|troubleshoot)\b/i,
      /\b(wrong|incorrect|bad|poor|low)\b/i
    ];

    // Determine message type
    if (greetingPatterns.some(pattern => pattern.test(lowerMessage))) {
      return { type: 'greeting', complexity: 'low', wordCount };
    }
    
    if (acknowledgmentPatterns.some(pattern => pattern.test(lowerMessage))) {
      return { type: 'acknowledgment', complexity: 'low', wordCount };
    }
    
    if (problemPatterns.some(pattern => pattern.test(lowerMessage))) {
      return { type: 'troubleshooting', complexity: 'high', wordCount };
    }
    
    if (technicalPatterns.some(pattern => pattern.test(lowerMessage))) {
      return { type: 'technical', complexity: 'high', wordCount };
    }
    
    if (complexQuestionPatterns.some(pattern => pattern.test(lowerMessage))) {
      return { type: 'detailed_question', complexity: 'high', wordCount };
    }
    
    // Default classification based on length and question marks
    if (wordCount <= 3) {
      return { type: 'simple', complexity: 'low', wordCount };
    } else if (wordCount <= 8 && !lowerMessage.includes('?')) {
      return { type: 'statement', complexity: 'medium', wordCount };
    } else {
      return { type: 'question', complexity: 'medium', wordCount };
    }
  }

  // Get appropriate response length based on message analysis
  static getResponseLength(messageAnalysis) {
    switch (messageAnalysis.type) {
      case 'greeting':
        return {
          maxTokens: 25,
          instruction: "MUST BE EXACTLY 1-2 sentences maximum. Simple greeting + brief offer to help. Example: 'Hi! I'm MotionSync AI, ready to help with your movement analysis. What can I assist you with?'",
          description: "Very brief greeting"
        };
        
      case 'acknowledgment':
        return {
          maxTokens: 20,
          instruction: "MUST BE EXACTLY 1 sentence only. Brief acknowledgment. Example: 'You're welcome! Let me know if you need more help.'",
          description: "Single sentence acknowledgment"
        };
        
      case 'simple':
        return {
          maxTokens: 60,
          instruction: "MUST BE 2-3 sentences maximum. Direct answer with minimal elaboration.",
          description: "Short and direct"
        };
        
      case 'statement':
        return {
          maxTokens: 100,
          instruction: "MUST BE 3-4 sentences maximum. Acknowledge statement and provide relevant follow-up.",
          description: "Moderate response"
        };
        
      case 'question':
        return {
          maxTokens: 150,
          instruction: "MUST BE 4-6 sentences maximum. Answer question clearly with actionable advice.",
          description: "Standard helpful response"
        };
        
      case 'technical':
        return {
          maxTokens: 250,
          instruction: "MUST BE 6-10 sentences maximum. Provide comprehensive guidance with specific steps.",
          description: "Detailed technical guidance"
        };
        
      case 'detailed_question':
        return {
          maxTokens: 300,
          instruction: "MUST BE 8-12 sentences maximum. Thorough explanation with examples and steps.",
          description: "Comprehensive explanation"
        };
        
      case 'troubleshooting':
        return {
          maxTokens: 350,
          instruction: "MUST BE 10-15 sentences maximum. Step-by-step solutions and preventive tips.",
          description: "Comprehensive troubleshooting"
        };
        
      default:
        return {
          maxTokens: 150,
          instruction: "MUST BE 4-6 sentences maximum. Balanced answer with helpful information.",
          description: "Standard response"
        };
    }
  }

  // Test API with MotionSync-focused test
  static async testAPI() {
    try {
      console.log('🧪 Testing Gemini 1.5 Flash API...');
      
      const testResponse = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: "Hello, give me a quick motion analysis tip"
            }]
          }]
        })
      });

      console.log('🧪 Test status:', testResponse.status);
      
      if (testResponse.ok) {
        const data = await testResponse.json();
        console.log('🧪 Test successful:', data);
        return true;
      } else {
        const errorText = await testResponse.text();
        console.log('🧪 Test failed:', errorText);
        return false;
      }
    } catch (error) {
      console.error('🧪 Test error:', error);
      return false;
    }
  }

  // Get MotionSync-focused suggested questions
  static getSuggestedQuestions(userData = null, userActions = []) {
    const baseQuestions = [
      '📹 How to set up motion tracking',
      '🎯 Improve my exercise form',
      '📊 Understand my motion scores',
      '🏃 Analyze my running technique',
      '💪 Check my lifting posture',
      '🤸 Movement pattern analysis',
    ];

    const contextualQuestions = [];

    if (userData) {
      // Beginner level suggestions
      if (userData.level <= 2) {
        contextualQuestions.push('🚀 Getting started with motion analysis');
        contextualQuestions.push('📱 Camera setup tips for best results');
      }
      
      // Advanced level suggestions
      if (userData.level >= 5) {
        contextualQuestions.push('🔬 Advanced movement analysis features');
        contextualQuestions.push('📈 Compare with professional athletes');
      }
      
      // Low sessions count
      if (userData.sessionsCompleted < 10) {
        contextualQuestions.push('✅ How to use MotionSync effectively');
      }
      
      // Motion score specific
      if (userData.lastMotionScore && userData.lastMotionScore < 70) {
        contextualQuestions.push('🎯 Improve my form quality score');
      }
    }

    // Check for specific exercise types in recent activities
    if (userActions && userActions.length > 0) {
      const exerciseTypes = userActions.slice(-5).map(a => a.type || a.exercise).filter(Boolean);
      
      if (exerciseTypes.includes('squat') || exerciseTypes.includes('squats')) {
        contextualQuestions.push('🏋️ Perfect my squat technique');
      }
      
      if (exerciseTypes.includes('pushup') || exerciseTypes.includes('push-up')) {
        contextualQuestions.push('💪 Improve my push-up form');
      }
      
      if (exerciseTypes.includes('deadlift')) {
        contextualQuestions.push('🏋️ Deadlift safety and form');
      }
      
      if (exerciseTypes.includes('running') || exerciseTypes.includes('run')) {
        contextualQuestions.push('🏃 Analyze my running gait');
      }
    }

    // Combine and return max 4 questions
    const allQuestions = [...contextualQuestions, ...baseQuestions];
    return allQuestions.slice(0, 4);
  }

  // Quick response for common MotionSync questions
  static getQuickResponse(question) {
    const quickResponses = {
      'camera': '📱 Position your phone 6-8 feet away, at chest height. Ensure good lighting and clear view of your full body. MotionSync works best with stable placement.',
      'motion': '📊 Motion scores range 0-100. Above 80 is excellent form, 60-80 is good, below 60 needs improvement. Our AI analyzes joint angles and movement patterns.',
      'setup': '🔧 For best results: good lighting, stable phone position, wear fitted clothing, clear background. MotionSync uses computer vision to track 33 body points.',
      'confidence': '🎯 Confidence scores show AI certainty (85%+ is reliable). Low confidence may mean poor lighting, blocked view, or complex movements.',
      'form': '✅ MotionSync analyzes your joint angles, movement speed, and posture in real-time. Red zones indicate form issues, green means good technique.',
      'accuracy': '🔬 Our AI is trained on thousands of movement patterns. For maximum accuracy, follow setup guidelines and perform exercises in the designated area.',
      'exercises': '💪 MotionSync supports squats, push-ups, deadlifts, lunges, planks, and running analysis. More exercises added regularly based on user requests.',
      'comparison': '🏆 Compare your form with professional athletes and certified trainers. See side-by-side analysis to understand optimal movement patterns.',
    };

    const lowerQuestion = question.toLowerCase();
    for (const [key, response] of Object.entries(quickResponses)) {
      if (lowerQuestion.includes(key)) {
        return response;
      }
    }
    
    return null;
  }

  // Check if message needs AI or can use quick response
  static shouldUseAI(message) {
    const simpleKeywords = ['camera', 'motion', 'setup', 'confidence', 'form', 'accuracy', 'exercises', 'comparison'];
    const lowerMessage = message.toLowerCase();
    
    // If message is very short and contains MotionSync-specific keywords, might use quick response
    if (message.length < 40 && simpleKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return false;
    }
    
    return true;
  }

  // Get exercise analysis recommendations based on motion data
  static getExerciseAnalysis(exerciseType, motionScore = null, commonErrors = []) {
    const exerciseGuidance = {
      'squat': {
        optimal: 'Keep chest up, knees track over toes, descend until thighs parallel to ground',
        common_errors: ['knees cave inward', 'forward lean', 'incomplete depth'],
        improvements: 'Focus on hip hinge movement, engage core, control descent speed'
      },
      'pushup': {
        optimal: 'Straight line from head to heels, elbows 45° from body, full range of motion',
        common_errors: ['hip sag', 'partial range', 'elbow flare'],
        improvements: 'Engage core throughout, lower chest to ground, controlled movement'
      },
      'deadlift': {
        optimal: 'Neutral spine, bar close to body, drive through heels, hip hinge pattern',
        common_errors: ['rounded back', 'bar drift', 'knee dominance'],
        improvements: 'Maintain back position, keep bar path vertical, focus on hip drive'
      },
      'plank': {
        optimal: 'Straight line from head to heels, neutral neck, engaged core',
        common_errors: ['hip drop', 'butt up', 'shoulder collapse'],
        improvements: 'Squeeze glutes, breathe normally, hold quality over duration'
      }
    };

    const guidance = exerciseGuidance[exerciseType.toLowerCase()] || exerciseGuidance['squat'];
    
    let feedback = `**${exerciseType.toUpperCase()} Analysis:**\n\n`;
    feedback += `✅ **Optimal Form:** ${guidance.optimal}\n\n`;
    
    if (motionScore !== null) {
      if (motionScore >= 80) {
        feedback += `🏆 **Your Score: ${motionScore}/100** - Excellent form! Keep it up.\n\n`;
      } else if (motionScore >= 60) {
        feedback += `👍 **Your Score: ${motionScore}/100** - Good form with room for improvement.\n\n`;
      } else {
        feedback += `⚠️ **Your Score: ${motionScore}/100** - Focus on form corrections below.\n\n`;
      }
    }
    
    feedback += `🎯 **Focus Areas:** ${guidance.improvements}`;
    
    return feedback;
  }

  // Get camera setup guidance for optimal motion tracking
  static getCameraSetupGuide() {
    return `📱 **Optimal Camera Setup for MotionSync:**

🎯 **Position:** 6-8 feet from exercise area
📐 **Height:** Chest level, phone horizontal
💡 **Lighting:** Bright, even lighting (avoid backlighting)
👕 **Clothing:** Fitted clothes, contrasting colors
🖼️ **Background:** Clear, uncluttered space
📱 **Stability:** Use phone stand or stable surface

**Pro Tips:**
• Ensure full body visibility in frame
• Test motion tracking before starting
• Check confidence score (aim for 85%+)
• Avoid shadows or reflective surfaces

MotionSync analyzes 33 body points for accurate form assessment!`;
  }
}

export default AIService;