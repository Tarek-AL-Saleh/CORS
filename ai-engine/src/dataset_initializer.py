import pandas as pd
import json
import re
import os

def build_course_dataset(history_csv_path, course_index_json_path):
    """
    Reads the historical offerings and the course index to build the ML dataset.
    """
    # 1. Load Data
    history_df = pd.read_csv(history_csv_path, sep=None, engine='python')
    
    # Ensure column names match your format (Year, Semester, Campus, Prefix, Number, Total, Passed, Failed, Fail_Ratio, Flag)
    # We will rename them for consistency in the script
    history_df.columns = ['year', 'semester', 'campus', 'prefix', 'number', 'total', 'passed', 'failed', 'fail_ratio', 'flag']
    
    #filter to only include Beirut and Byblos campuses (remove online data)
    history_df = history_df[history_df['campus'].isin(['Beirut', 'Byblos'])]

    # Combine prefix and number to create 'course_code' (e.g., 'CSC' + 245 = 'CSC245')
    history_df['course_code'] = history_df['prefix'].astype(str) + history_df['number'].astype(str)
    
    with open(course_index_json_path, 'r') as f:
        course_index = json.load(f)

    # 2. Compute Bottleneck Scores
    bottleneck_counts = {}
    for course, details in course_index.items():
        prereqs = details.get('prerequisites', [])
        for prereq in prereqs:
            bottleneck_counts[prereq] = bottleneck_counts.get(prereq, 0) + 1

    # 3. Create a Timeline Index (To easily find "previous term" and "gap")
    # This assigns a numerical value to time: 2021 Spring -> 6063, 2021 Fall -> 6065
    term_order = {'Spring': 0, 'Summer': 1, 'Fall': 2}
    history_df['time_idx'] = history_df['year'] * 3 + history_df['semester'].map(term_order)
    
    all_time_indices = sorted(history_df['time_idx'].unique())
    all_campuses = ['Beirut', 'Byblos']
    all_courses = list(course_index.keys())

    dataset = []

    # 4. Iterate chronologically to build the dataset
    for t_idx in all_time_indices:
        current_term_data = history_df[history_df['time_idx'] == t_idx]
        if current_term_data.empty: continue
        
        current_year = current_term_data['year'].iloc[0]
        current_semester = current_term_data['semester'].iloc[0]
        
        # Datasets for calculating historical features without "seeing" the future
        prev_term_data = history_df[history_df['time_idx'] == (t_idx - 1)]
        last_year_data = history_df[(history_df['year'] == current_year - 1) & 
                                    (history_df['semester'] == current_semester)]
        past_3_years_data = history_df[(history_df['time_idx'] < t_idx) & 
                                       (history_df['year'] >= current_year - 3)]

        for campus in all_campuses:
            for course_code in all_courses:
                course_details = course_index[course_code]

                # --- CORE AND MATH FLAGS ---
                course_type = course_details.get('type', '').lower()
                is_core = 1 if course_type == "core" else 0
                is_math = 1 if course_type == "math" else 0
                
                # --- IDENTIFIERS ---
                prefix = re.match(r"([A-Za-z]+)", course_code).group(1) if re.match(r"([A-Za-z]+)", course_code) else "UNK"
                level = int(str(course_code)[-3]) if str(course_code)[-3].isdigit() else 0 # Extracts '3' from 'CSC310'

                # --- TARGET (Label) ---
                is_offered = 1 if not current_term_data[(current_term_data['course_code'] == course_code) & 
                                                        (current_term_data['campus'] == campus)].empty else 0
                
                # --- HISTORICAL ---
                past_course_data = past_3_years_data[(past_3_years_data['course_code'] == course_code) & 
                                                     (past_3_years_data['campus'] == campus)]
                
                if not past_course_data.empty and past_course_data['total'].sum() > 0:
                    avg_fail_ratio_3y = past_course_data['failed'].sum() / past_course_data['total'].sum()
                    
                    # Recent fail count from its very last offering
                    most_recent = past_course_data[past_course_data['time_idx'] == past_course_data['time_idx'].max()]
                    recent_fail_count = most_recent['failed'].sum()
                    gap_since_last = t_idx - most_recent['time_idx'].iloc[0]
                else:
                    avg_fail_ratio_3y = 0.0
                    recent_fail_count = 0
                    gap_since_last = 99 # High number if never offered
                    
                is_offered_last_yr = 1 if not last_year_data[(last_year_data['course_code'] == course_code) & 
                                                             (last_year_data['campus'] == campus)].empty else 0
                
                # --- STUDENT FLOW ---
                latent_demand = 0
                prereqs = course_details.get('prerequisites', [])
                for req in prereqs:
                    req_passed = prev_term_data[(prev_term_data['course_code'] == req) & 
                                                (prev_term_data['campus'] == campus)]['passed'].sum()
                    latent_demand += req_passed
                
                b_score = bottleneck_counts.get(course_code, 0)
                
                # --- CURRICULUM ---
                study_plan_val = course_details.get('study_plan', '').lower()
                if study_plan_val == "both" or study_plan_val == current_semester.lower():
                    plan_alignment_score = 1.0
                else:
                    plan_alignment_score = 0.0

                # Append to dataset
                dataset.append({
                    'year': current_year,
                    'semester': current_semester,
                    'campus': campus,
                    'course_code': course_code,
                    'course_prefix': prefix,
                    'is_core': is_core,
                    'is_math': is_math,
                    'avg_fail_ratio_3y': round(avg_fail_ratio_3y, 3),
                    'recent_fail_count': int(recent_fail_count),
                    'is_offered_last_year': is_offered_last_yr,
                    'latent_demand_count': int(latent_demand),
                    'bottleneck_score': b_score,
                    'plan_alignment_score': plan_alignment_score,
                    'course_level': level,
                    'gap_since_last_offered': int(gap_since_last),
                    'is_offered': is_offered
                })

    return pd.DataFrame(dataset)


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
HISTORY_PATH = os.path.join(BASE_DIR, '..', 'data', 'clean_course_history.csv')
INDEX_PATH = os.path.join(BASE_DIR, '..', 'data', 'course_index.json')
OUTPUT_PATH = os.path.join(BASE_DIR, '..', 'data', 'master_training_dataset.csv')

if __name__ == "__main__":
    df = build_course_dataset(HISTORY_PATH, INDEX_PATH)
    
    if df is not None:
        df.to_csv(OUTPUT_PATH, index=False)
        print(f"Success! Saved to: {OUTPUT_PATH}")