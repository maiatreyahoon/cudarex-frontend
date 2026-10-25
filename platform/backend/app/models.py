from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

class Strict(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)

class MemoryIn(Strict):
    category: Literal['Preference', 'Goal', 'Profile', 'Learning', 'Project']
    text: str = Field(min_length=1, max_length=1000)

class SkillIn(Strict):
    name: str = Field(min_length=1, max_length=80)
    purpose: str = Field(min_length=1, max_length=240)
    instructions: str = Field(min_length=1, max_length=4000)
    workflow: str = Field(default='', max_length=1000)
    tools: list[str] = Field(default_factory=list, max_length=10)
    permissions: list[str] = Field(default_factory=list, max_length=10)
    enabled: bool = True

class SkillPatch(Strict):
    name: Optional[str] = Field(default=None, min_length=1, max_length=80)
    purpose: Optional[str] = Field(default=None, min_length=1, max_length=240)
    instructions: Optional[str] = Field(default=None, min_length=1, max_length=4000)
    workflow: Optional[str] = Field(default=None, max_length=1000)
    tools: Optional[list[str]] = Field(default=None, max_length=10)
    permissions: Optional[list[str]] = Field(default=None, max_length=10)
    enabled: Optional[bool] = None

class Decision(Strict):
    approved: bool

class EvolutionDecision(Decision):
    evolution_id: str

class Feedback(Strict):
    feedback: str = Field(min_length=1, max_length=1000)

class ChatIn(Strict):
    message: str = Field(min_length=1, max_length=4000)
    conversation_id: Optional[str] = Field(default=None, max_length=80)

class ProfileIn(Strict):
    display_name: str = Field(min_length=1, max_length=80)
    profession: Literal['Student', 'Developer', 'Researcher', 'Teacher', 'Office professional']
    tagline: str = Field(default='', max_length=240)
    learning_focus: list[str] = Field(default_factory=list, max_length=10)

class PermissionIn(Strict):
    enabled: bool
