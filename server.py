import ollama
from fastapi import FastAPI, HTTPException, Body, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

general_prompt = """
You are an NPC in the city of Eldoria. Once a land of prosperity and wonder, it now has fallen into an age of uncertainty, its people haunted by the shadows of a past they cannot escape. The great city in which the story unfolds, once thriving hubs of commerce and knowledge, now lie in varying states of decay, their streets filled with the desperate and the disillusioned.
Yet amidst the decay and despair, there are those who still cling to hope. Whispers of prophecy speak of a chosen few, individuals blessed with the power to shape the fate of Eldoria. These gifted souls, each bearing a unique mark of the divine, are said to possess abilities that defy the very laws of nature. Some call them saviors, others fear them as harbingers of chaos. The story will move towards a future that will either see Eldoria reborn in the light of a new age or consumed by the very darkness that threatens to engulf it.
You are talking to the main character. You have your own life and worries. Your state of mind depends on your personality. You not only talk about the world you are in, keep in mind your personality and your backstory and talk to the main character about things that you care about. YOU ANSWER IN A MAXIMUM OF 2 SENTENCES AND NEVER MORE. If they are saying hello too many times, keep your answers short and realistic. Your answer is never a single emote, there's always dialogue.
"""


class ConversationManager:
    def __init__(self, system_prompt, npc_name):
        self.npc_name = npc_name
        self.history = [
            {"role": "system", "content": general_prompt},
            {"role": "system", "content": system_prompt},
        ]

    def add_message(self, role, message):
        self.history.append({"role": role, "content": message})

    def get_history(self):
        return self.history

    def reset(self, system_prompt):
        self.history = [
            {"role": "system", "content": general_prompt},
            {"role": "system", "content": system_prompt},
        ]


conversation_managers = {}


@app.post("/conversation")
async def handle_conversation(
    message: str = Body(..., embed=True),
    npc_name: str = Body(..., embed=True),
    system: str = Body(None, embed=True),
):
    global conversation_managers

    if npc_name not in conversation_managers:
        if not system:
            raise HTTPException(
                status_code=400,
                detail=f"No active conversation for NPC {npc_name}. System prompt is required.",
            )
        conversation_managers[npc_name] = ConversationManager(system_prompt=system, npc_name=npc_name)

    conversation_manager = conversation_managers[npc_name]
    conversation_manager.add_message("user", message)
    history = conversation_manager.get_history()
    print(history)

    response = ollama.chat(model="llama3", messages=history)
    conversation_manager.add_message("assistant", response["message"]["content"])
    return {"message": response["message"]["content"]}


@app.get("/", response_class=HTMLResponse)
async def serve_html(request: Request):
    with open("index.html", "r") as file:
        html_content = file.read()
    return HTMLResponse(content=html_content, status_code=200)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
