import pandas as pd
import numpy as np
import re

def process_course_offerings(file_path):
    # 1. Load Data
    if file_path.endswith('.xlsx') or file_path.endswith('.xls'):
        # Use openpyxl for Excel files
        df = pd.read_excel(file_path, skiprows=4)
    else:
        # Use read_csv for CSV files
        df = pd.read_csv(file_path, skiprows=4)

    # Clean whitespace from column headers
    df.columns = df.columns.str.strip()

    # 2. Forward Fill Identifiers
    # In these reports, Term, Campus, and Course are only written once per group.
    # We fill them down so that the 'Total' row has all the info it needs.
    df['Term'] = df['Term'].ffill()
    df['Campus'] = df['Campus'].ffill()
    df['Course'] = df['Course'].ffill()

    # 3. Filter for Aggregate Rows Only
    # We only care about the rows where the university has already summed the data
    df_totals = df[df['Section'] == 'Total'].copy()

    # 4. Extract and Rename Columns
    # Including Campus as requested
    cols_to_keep = [
        'Term', 'Campus', 'Course', 'Total', 
        'Passing Grades (A B C D P)', 
        'Failed Grades (F NP)',
        'Passing Rate out of Total'
    ]
    
    # Safety check: only keep columns that actually exist in the file
    available_cols = [c for c in cols_to_keep if c in df_totals.columns]
    df_totals = df_totals[available_cols]

    df_totals.rename(columns={
        'Term': 'term_raw',
        'Campus': 'campus',
        'Course': 'course_code',
        'Total': 'total_enrolled',
        'Passing Grades (A B C D P)': 'passed_count',
        'Failed Grades (F NP)': 'failed_count',
        'Passing Rate out of Total': 'passing_rate'
    }, inplace=True)

    # 5. Temporal Formatting & Logic
    # Split "Fall 2020" into Semester and Year
    split_term = df_totals['term_raw'].astype(str).str.split(' ', n=1, expand=True)
    df_totals['semester'] = split_term[0]
    df_totals['year'] = split_term[1]

    # Convert numeric columns safely
    df_totals['total_enrolled'] = pd.to_numeric(df_totals['total_enrolled'], errors='coerce').fillna(0)
    df_totals['failed_count'] = pd.to_numeric(df_totals['failed_count'], errors='coerce').fillna(0)
    
    # Calculate Fail Ratio (using the existing passing rate or calculating from counts)
    df_totals['passing_rate'] = pd.to_numeric(df_totals['passing_rate'], errors='coerce').fillna(0)
    df_totals['fail_ratio'] = 1 - df_totals['passing_rate']
    
    # Target Variable: 1 (These courses were successfully offered)
    df_totals['is_offered'] = 1

    # Cleanup: remove the raw term column if no longer needed
    df_totals.drop(columns=['term_raw'], inplace=True)

    return df_totals.reset_index(drop=True)

def split_course_code(code):
    match = re.match(r"^([A-Z]+)(.*)$", str(code).strip())
    if match:
        return match.group(1), match.group(2)
    return code, None
