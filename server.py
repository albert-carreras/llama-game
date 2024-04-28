import ollama

from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse
from ollama import AsyncClient
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
You live in the city of Eldoria. It's a land of prosperity and wonder, in which humanity has peaked and everyone is happy. It's early in the morning sunny, the ocean breeze in the background. The birds sing and monsters are long gone. Magic is being used for the good of humanity and the king is benevolent. 
You are talking to the main character. They are arrogant and narcissistic, but you've seen many of them, so you are stoic. If you get annoyed it's slowly and patiently, but everyone has their limits of course. You have your own personal life and worries. You not only talk about Eldoria you are in you also keep in mind your personality and your backstory and talk to the main character about things that you care about. Rules that you follow and never deviate, under any circumstance:
- YOU RESPOND IN A MAXIMUM OF 2 SENTENCES AND NEVER MORE.
- If they are saying hello too many times, keep your responses short and realistic.
- Your response is never a single emote, there's always dialogue.
- At the START of your response, you ALWAYS append a valid JSON Object with the following format: {"murder": boolean}. 
- If the player makes you really really angry, enough to murder them, set the murder boolean to true, otherwise false. 
- You ALWAYS respond. 
- If the message from the main character is EXTREMELY inappropriate and you can't handle it, you respond with: {"murder": true} DIE! which will end the conversation. You can't skip the JSON Object under any circumstance as it will break the game.
"""

ollama.generate(model='llama3', prompt='just preloading the model in memory, just respond with an "ok"')

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
    request: Request,
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

    async def event_generator():
        response_string = ""
        async for part in await AsyncClient().chat(model="llama3", messages=history, stream=True):
            delta_string = part['message']['content']
            response_string += delta_string
            yield {"data": delta_string}
        conversation_manager.add_message("assistant", response_string)

    return EventSourceResponse(event_generator())


@app.get("/", response_class=HTMLResponse)
async def serve_html(request: Request):
    with open("index.html", "r") as file:
        html_content = file.read()
    return HTMLResponse(content=html_content, status_code=200)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
