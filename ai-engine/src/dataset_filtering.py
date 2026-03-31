import pandas as pd
import os

# 1. SETUP PATHS
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, '..', 'data')

INPUT_FILE = os.path.join(DATA_DIR, 'master_training_dataset.csv')
OUTPUT_FILE = os.path.join(DATA_DIR, 'filtered_training_dataset.csv')

def filter_prefixes():
    if not os.path.exists(INPUT_FILE):
        print(f"Error: Could not find {INPUT_FILE}. Run the initializer first.")
        return

    # Load the master dataset
    df = pd.read_csv(INPUT_FILE)
    print(f"Original dataset size: {len(df)} rows")

    # Define the prefixes we want to keep
    allowed_prefixes = ['CSC', 'MTH', 'BIF', 'STA']

    # 2. FILTERING LOGIC
    # Ensure course_prefix is string and uppercase for safety
    df['course_prefix'] = df['course_prefix'].astype(str).str.upper()
    
    filtered_df = df[df['course_prefix'].isin(allowed_prefixes)].copy()

    # 3. SAVE AND SUMMARY
    filtered_df.to_csv(OUTPUT_FILE, index=False)
    
    print("\n--- Filtering Complete ---")
    print(f"Kept prefixes: {allowed_prefixes}")
    print(f"Remaining rows: {len(filtered_df)}")
    print(f"Removed {len(df) - len(filtered_df)} rows of unrelated data.")
    print(f"File saved to: {OUTPUT_FILE}")

if __name__ == "__main__":
    filter_prefixes()