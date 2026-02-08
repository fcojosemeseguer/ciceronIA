import os
from tinydb import TinyDB, Query
from langchain_openai import ChatOpenAI
from langchain_core.messages import BaseMessage, messages_from_dict, messages_to_dict
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables.history import RunnableWithMessageHistory
from dotenv import load_dotenv

from data.prompts.prompts import system_prompt_upct

load_dotenv()
if not os.getenv("OPENAI_API_KEY"):
    raise ValueError(
        "OpenAI key not found")


class TinyDBChatMessageHistory(BaseChatMessageHistory):
    def __init__(self, session_id: str, project_id: str, db_path: str = "db.json"):
        self.db = TinyDB(db_path)
        self.table = self.db.table("chat_history")
        self.session_id = session_id
        self.project_id = project_id

    @property
    def messages(self):
        Record = Query()
        res = self.table.get((Record.session_id == self.session_id) & (
            Record.project_id == self.project_id))
        if res:
            return messages_from_dict(res["messages"])
        return []

    def add_message(self, message: BaseMessage) -> None:
        Record = Query()
        existing = self.table.get((Record.session_id == self.session_id) & (
            Record.project_id == self.project_id))

        current_messages = self.messages
        current_messages.append(message)
        messages_dict = messages_to_dict(current_messages)

        if existing:
            self.table.update(
                {"messages": messages_dict},
                (Record.session_id == self.session_id) & (
                    Record.project_id == self.project_id)
            )
        else:
            self.table.insert({
                "session_id": self.session_id,
                "project_id": self.project_id,
                "messages": messages_dict
            })

    def clear(self) -> None:
        Record = Query()
        self.table.remove((Record.session_id == self.session_id)
                          & (Record.project_id == self.project_id))


def setup_chat(project_id: str):
    llm = ChatOpenAI(model="gpt-5-2025-08-07", temperature=0)
    # llm = ChatOpenAI(model="gpt-5-mini-2025-08-07", temperature=0)

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt_upct),
        MessagesPlaceholder(variable_name="history"),
        ("human", "{input}"),
    ])

    chain = prompt | llm

    return RunnableWithMessageHistory(
        chain,
        lambda session_id: TinyDBChatMessageHistory(session_id, project_id),
        input_messages_key="input",
        history_messages_key="history",
    )
