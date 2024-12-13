import math
import os
import warnings

import pandas as pd
from singleton_decorator import singleton

from src.annotations.init_logger import init_logger
from src.utils.tools import safe_json_loads

warnings.filterwarnings("ignore", category=FutureWarning)  # Todo: Delete it later on.


@singleton
@init_logger()
class TableStorage:
    def __init__(self):
        self.tables = {}  # table_id, pandas DataFrame
        self.init_db()

    def init_db(self):
        """
        Initialize the storage by reading all CSV files in the configured directory.
        Each CSV file should be named by the table_id and its content will be loaded into a pandas DataFrame.
        """
        csv_directory = './csv_storage'  # Directory where CSV files are stored
        if not os.path.exists(csv_directory):
            os.makedirs(csv_directory)

        for file in os.listdir(csv_directory):
            if file.endswith('.csv'):
                table_id = file[:-4]  # Removing '.csv' to get the table_id
                file_path = os.path.join(csv_directory, file)
                self.tables[table_id] = pd.read_csv(file_path)
                self.logger.info(f'Table {table_id} initialized from {file}')

    @staticmethod
    def clean_for_json(val):
        if isinstance(val, float):
            if math.isnan(val) or math.isinf(val):
                return None
            return val
        return val

    async def get(self, table_id, page=0, page_size=50, message_id=None):
        """
        Get the content of the table with the given table_id and return the specified page.
        If a message_id is specified, return only rows with that message_id, focusing on the last one if there are duplicates.
        If page 0 is requested, return the most current rows by reversing the DataFrame.
        """

        if table_id in self.tables:
            df = self.tables[table_id].iloc[::-1]  # Reverse the DataFrame to get the most current rows first

            # Filter by message_id if provided
            if message_id is not None:
                df = df[df['message_id'] == message_id]  # Filter to keep only rows with the specific message_id
                if df.empty:
                    self.logger.error(f"No entries found for message_id {message_id} in table {table_id}.")
                    return None
                df = df.head(1)  # Get the most recent row only if there are duplicates

            start_row = page * page_size
            end_row = start_row + page_size

            # Ensure that row slicing does not go out of bounds
            if start_row < len(df):
                cleaned_df = df.iloc[start_row:min(end_row, len(df))].applymap(self.clean_for_json)
                return cleaned_df.to_dict(orient='records')
            else:
                return []  # Return an empty list if the page is out of bounds
        else:
            self.logger.error(f'Table {table_id} not found.')
            return None

    async def get_time_range(self, table_id, start_time: float = 0.0, end_time=float('inf')):
        if table_id in self.tables:
            df = self.tables[table_id].iloc[::-1]  # Reverse the DataFrame to get the most current rows first
            df['timestamp'] = df['timestamp'].astype(float)
            df = df[(df['timestamp'] > start_time) & (df['timestamp'] < end_time) & (
                    (df['message_type'] == 'text') | (df['message_type'] == 'timeline') | (
                    df['message_type'] == 'callback_data'))]
            df = df.drop(columns=['chat_id', 'message_id', 'reply_markup'])

            if df.empty:
                self.logger.warning(
                    f"From: get_time_range, No entries found for start_time={start_time}, end_time={end_time}, table_id={table_id}.")
                return []

            cleaned_df = df.applymap(self.clean_for_json)
            results_dict = cleaned_df.to_dict(orient='records')
            for res in results_dict:
                if res['message_type'] != 'text':  # Text is not a json
                    res['message'] = safe_json_loads(res['message'])
            return results_dict

        self.logger.error(f'Table {table_id} not found.')
        return None

    async def get_table_data(self, table_id):
        """
        Get detailed information about the table with the given table_id, ensuring all data is JSON serializable.
        """
        if table_id in self.tables:
            df = self.tables[table_id]
            sample_data = df.head().applymap(self.clean_for_json).to_dict(orient='records')

            data_info = {
                "number_of_rows": len(df),
                "number_of_columns": len(df.columns),
                "column_names": list(df.columns),
                "sample_data": sample_data
            }
            return data_info
        else:
            self.logger.error(f'Table {table_id} not found.')
            return None

    async def post(self, table_id, value):
        """
        Add a new row to the table with the given table_id. If the row with the same message_id exists, update it; otherwise, add as a new row.
        """
        if table_id not in self.tables:
            await self._create_table(table_id)

        # Create a new DataFrame for the new value
        new_row = pd.DataFrame([value])
        message_id = value['message_id']

        if 'message_id' in self.tables[table_id].columns and message_id in self.tables[table_id]['message_id'].values:
            # Update existing row
            index = self.tables[table_id][self.tables[table_id]['message_id'] == message_id].index[0]
            for col in new_row.columns:
                self.tables[table_id].at[index, col] = new_row.at[0, col]
            log_message = f'Row updated in table {table_id}: {value}'
        else:
            # Concatenate the new row to the existing DataFrame if message_id not found
            self.tables[table_id] = pd.concat([self.tables[table_id], new_row], ignore_index=True)
            log_message = f'Row added to table {table_id}: {value}'

        # Save the updated DataFrame back to CSV
        self._save_table_to_csv(table_id)
        self.logger.info(log_message)

    def _save_table_to_csv(self, table_id):
        """
        Save the DataFrame to a CSV file.
        """
        file_path = f'./csv_storage/{table_id}.csv'
        self.tables[table_id].to_csv(file_path, index=False)
        self.logger.info(f'Table {table_id} saved to {file_path}')

    async def _create_table(self, table_id):
        """
        Create a new table with the given table_id.
        """
        self.tables[table_id] = pd.DataFrame()
        self._save_table_to_csv(table_id)
        self.logger.info(f'Table {table_id} created.')

    async def get_callback_query(self, table_id, query_message_id):
        if table_id in self.tables:
            df = self.tables[table_id].iloc[::-1]
            callback_data_df = df[df['message_type'] == 'callback_data']
            query_df = callback_data_df[callback_data_df['message'].apply(
                lambda x: safe_json_loads(x).get('query_message_id') == query_message_id)]
            query_df = query_df.drop(columns=['reply_markup'])
            results_dict = query_df.to_dict(orient='records')
            for res in results_dict:
                res['message'] = safe_json_loads(res['message'])
            return results_dict
