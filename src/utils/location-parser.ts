import { INDIAN_STATES_AND_DISTRICTS, getStateByDistrict } from '@/data/indian-states-districts';

export interface ParsedLocation {
  state: string | null;
  district: string | null;
  confidence: number;
}

/**
 * Parse location description to extract Indian state and district
 * @param locationDescription - The location description text
 * @returns ParsedLocation object with state, district, and confidence score
 */
export function parseIndianLocation(locationDescription: string): ParsedLocation {
  if (!locationDescription) {
    return { state: null, district: null, confidence: 0 };
  }

  const text = locationDescription.toLowerCase();
  let state: string | null = null;
  let district: string | null = null;
  let confidence = 0;

  // Try to find district first (more specific)
  for (const stateData of INDIAN_STATES_AND_DISTRICTS) {
    for (const dist of stateData.districts) {
      // Check for exact district name match
      if (text.includes(dist.toLowerCase())) {
        district = dist;
        state = stateData.state;
        confidence = 0.9;
        break;
      }
      
      // Check for partial matches (e.g., "Bangalore" for "Bengaluru Urban")
      if (dist.toLowerCase().includes(text.split(' ').find(word => word.length > 3)?.toLowerCase() || '') ||
          text.includes(dist.toLowerCase().split(' ')[0])) {
        district = dist;
        state = stateData.state;
        confidence = 0.7;
        break;
      }
    }
    if (district) break;
  }

  // If no district found, try to find state
  if (!state) {
    for (const stateData of INDIAN_STATES_AND_DISTRICTS) {
      const stateNameLower = stateData.state.toLowerCase();
      
      // Check for exact state name match
      if (text.includes(stateNameLower)) {
        state = stateData.state;
        confidence = 0.8;
        break;
      }
      
      // Check for state code or common abbreviations
      if (text.includes(stateData.code.toLowerCase())) {
        state = stateData.state;
        confidence = 0.6;
        break;
      }
      
      // Check for partial state name matches
      const stateWords = stateNameLower.split(' ');
      for (const word of stateWords) {
        if (word.length > 3 && text.includes(word)) {
          state = stateData.state;
          confidence = 0.5;
          break;
        }
      }
      if (state) break;
    }
  }

  // Additional heuristics for common patterns
  if (!state && !district) {
    // Check for common city names that might indicate state
    const cityStateMap: { [key: string]: string } = {
      'mumbai': 'Maharashtra',
      'delhi': 'Delhi',
      'bangalore': 'Karnataka',
      'chennai': 'Tamil Nadu',
      'kolkata': 'West Bengal',
      'hyderabad': 'Telangana',
      'pune': 'Maharashtra',
      'ahmedabad': 'Gujarat',
      'jaipur': 'Rajasthan',
      'lucknow': 'Uttar Pradesh',
      'kanpur': 'Uttar Pradesh',
      'nagpur': 'Maharashtra',
      'indore': 'Madhya Pradesh',
      'thane': 'Maharashtra',
      'bhopal': 'Madhya Pradesh',
      'visakhapatnam': 'Andhra Pradesh',
      'pimpri': 'Maharashtra',
      'patna': 'Bihar',
      'vadodara': 'Gujarat',
      'ghaziabad': 'Uttar Pradesh',
      'ludhiana': 'Punjab',
      'agra': 'Uttar Pradesh',
      'nashik': 'Maharashtra',
      'faridabad': 'Haryana',
      'meerut': 'Uttar Pradesh',
      'rajkot': 'Gujarat',
      'kalyan': 'Maharashtra',
      'vasai': 'Maharashtra',
      'varanasi': 'Uttar Pradesh',
      'srinagar': 'Jammu and Kashmir',
      'aurangabad': 'Maharashtra',
      'dhanbad': 'Jharkhand',
      'amritsar': 'Punjab',
      'navi mumbai': 'Maharashtra',
      'allahabad': 'Uttar Pradesh',
      'ranchi': 'Jharkhand',
      'howrah': 'West Bengal',
      'coimbatore': 'Tamil Nadu',
      'jabalpur': 'Madhya Pradesh',
      'gwalior': 'Madhya Pradesh',
      'vijayawada': 'Andhra Pradesh',
      'jodhpur': 'Rajasthan',
      'madurai': 'Tamil Nadu',
      'raipur': 'Chhattisgarh',
      'kota': 'Rajasthan',
      'guwahati': 'Assam',
      'chandigarh': 'Chandigarh',
      'solapur': 'Maharashtra',
      'hubli': 'Karnataka',
      'tiruchirappalli': 'Tamil Nadu',
      'bareilly': 'Uttar Pradesh',
      'moradabad': 'Uttar Pradesh',
      'mysore': 'Karnataka',
      'tiruppur': 'Tamil Nadu',
      'gurgaon': 'Haryana',
      'aligarh': 'Uttar Pradesh',
      'jalandhar': 'Punjab',
      'bhubaneswar': 'Odisha',
      'salem': 'Tamil Nadu',
      'warangal': 'Telangana',
      'guntur': 'Andhra Pradesh',
      'bikaner': 'Rajasthan',
      'saharanpur': 'Uttar Pradesh',
      'gorakhpur': 'Uttar Pradesh',
      'faizabad': 'Uttar Pradesh',
      'kochi': 'Kerala',
      'shimla': 'Himachal Pradesh',
      'dehradun': 'Uttarakhand',
      'cuttack': 'Odisha',
      'bokaro': 'Jharkhand',
      'rourkela': 'Odisha',
      'siliguri': 'West Bengal',
      'durg': 'Chhattisgarh',
      'bilaspur': 'Chhattisgarh',
      'noida': 'Uttar Pradesh',
      'greater noida': 'Uttar Pradesh',
      'gurugram': 'Haryana',
      'bengaluru': 'Karnataka',
      'thiruvananthapuram': 'Kerala'
    };

    for (const [city, stateName] of Object.entries(cityStateMap)) {
      if (text.includes(city)) {
        state = stateName;
        confidence = 0.6;
        break;
      }
    }
  }

  return { state, district, confidence };
}

/**
 * Enhanced location parsing that also considers address patterns
 * @param locationDescription - The location description text
 * @returns ParsedLocation with additional context
 */
export function parseLocationWithContext(locationDescription: string): ParsedLocation & {
  method: string;
  originalText: string;
} {
  const originalText = locationDescription;
  let result = parseIndianLocation(locationDescription);
  
  // Try additional parsing for common address patterns
  if (result.confidence < 0.5) {
    // Look for patterns like "near [place]", "in [place]", "at [place]"
    const patterns = [
      /near\s+([^,\.]+)/i,
      /in\s+([^,\.]+)/i,
      /at\s+([^,\.]+)/i,
      /[^,]+,\s*([^,]+)/i, // Last part after comma
    ];
    
    for (const pattern of patterns) {
      const match = locationDescription.match(pattern);
      if (match && match[1]) {
        const parsed = parseIndianLocation(match[1].trim());
        if (parsed.confidence > result.confidence) {
          result = parsed;
          break;
        }
      }
    }
  }
  
  return {
    ...result,
    method: result.confidence > 0 ? 'direct_match' : 'no_match',
    originalText
  };
}

/**
 * Validate if a given state-district combination is valid
 * @param state - State name
 * @param district - District name
 * @returns boolean indicating if the combination is valid
 */
export function isValidStateDistrict(state: string, district: string): boolean {
  const stateData = INDIAN_STATES_AND_DISTRICTS.find(s => 
    s.state.toLowerCase() === state.toLowerCase()
  );
  
  if (!stateData) return false;
  
  return stateData.districts.some(d => 
    d.toLowerCase() === district.toLowerCase()
  );
}