---
license: cc-by-nc-4.0
pretty_name: Rigby Kinematic Motion Dataset
task_categories:
- robotics
language:
- en
tags:
- motion
- kinematics
- cross-embodiment
- motion-primitives
- mujoco
- llm-generated
size_categories:
- 1K<n<10K
configs:
- config_name: clips
  data_files: index/clips.jsonl
  default: true
- config_name: bodies
  data_files: index/bodies.jsonl
- config_name: primitives
  data_files: index/primitives.jsonl
---

# Rigby kinematic motion dataset

3,844 motion clips for 25 robots (arms, quadrupeds, humanoids, hexapods, an octopus, wheeled bodies and a crane). Every clip passes every physical check; takes that failed one were removed. Each robot's motion primitives were written by a language model from the robot's model alone and measured by forward kinematics; each skill clip is a program over those primitives, compiled to joint trajectories and checked frame by frame against a fixed set of physical constraints.

The clips are **kinematic**: poses, contacts and support are physically possible, but no dynamics were simulated.

## At a glance

| | |
|---|---|
| Clips | 3,844: 541 skill, 153 task-blind, 3,150 procedural |
| Physical checks | every clip passes all of them, on every frame (joint limits, self-collision, floor penetration, planted-foot slip, support, reach, continuity, wheel slip) |
| Robots | 25 (4 held out for transfer tests) |
| Skills | 12 |
| Primitives | 361 modes, 56 gaits |
| Motion | 6.4 h at 50 fps |
| Language models | gpt-6.1-sol |
| Total model spend | $11.07 |

## Robots

| Robot | Body plan | Joints | Source model | Licence of the model | Skill clips | Procedural |
|---|---|---|---|---|---|---|
| ANYmal C | quadruped | 12 | MuJoCo Menagerie | BSD-3-Clause | 34 | 150 |
| Apptronik Apollo | humanoid | 32 | MuJoCo Menagerie | Apache-2.0 | 32 | 150 |
| Booster T1 (held out) | humanoid | 23 | MuJoCo Menagerie | Apache-2.0 | 6 | 0 |
| Spot | quadruped | 12 | MuJoCo Menagerie | BSD-3-Clause | 37 | 150 |
| Franka Panda | arm | 16 | MuJoCo Menagerie | Apache-2.0 | 26 | 150 |
| Kinova Gen3 | arm | 14 | MuJoCo Menagerie | BSD-3-Clause | 26 | 150 |
| KUKA iiwa 14 (held out) | arm | 14 | MuJoCo Menagerie | BSD-3-Clause | 3 | 0 |
| Mobile crane (procedural) | crane | 8 | procedural (this repository) | CC BY-NC 4.0 (this dataset) | 31 | 150 |
| Dog with an arm (procedural) | mobile_manipulator | 18 | procedural (this repository) | CC BY-NC 4.0 (this dataset) | 37 | 150 |
| Octopus (procedural) | octopus | 52 | procedural (this repository) | CC BY-NC 4.0 (this dataset) | 38 | 150 |
| Wheeled biped (procedural) | wheeled | 11 | procedural (this repository) | CC BY-NC 4.0 (this dataset) | 24 | 150 |
| Random gripper 41 (procedural) | arm | 15 | procedural (this repository) | CC BY-NC 4.0 (this dataset) | 26 | 150 |
| Simple dog (procedural) | quadruped | 12 | procedural (this repository) | CC BY-NC 4.0 (this dataset) | 32 | 150 |
| xArm7 | arm | 20 | MuJoCo Menagerie | BSD-3-Clause | 26 | 150 |
| Unitree A1 | quadruped | 12 | MuJoCo Menagerie | BSD-3-Clause | 37 | 150 |
| Unitree G1 | humanoid | 29 | MuJoCo Menagerie | BSD-3-Clause | 38 | 150 |
| Unitree Go2 | quadruped | 12 | MuJoCo Menagerie | BSD-3-Clause | 37 | 150 |
| Unitree H1 | humanoid | 19 | MuJoCo Menagerie | BSD-3-Clause | 29 | 150 |
| UR5e | arm | 13 | MuJoCo Menagerie | BSD-3-Clause | 26 | 150 |
| Hexapod, new draw (procedural) (held out) | multileg | 18 | procedural (this repository) | CC BY-NC 4.0 (this dataset) | 6 | 0 |
| Hexapod (procedural) | multileg | 18 | procedural (this repository) | CC BY-NC 4.0 (this dataset) | 37 | 150 |
| Reverse-knee quadruped, new draw (procedural) (held out) | quadruped | 12 | procedural (this repository) | CC BY-NC 4.0 (this dataset) | 6 | 0 |
| Reverse-knee quadruped (procedural) | quadruped | 12 | procedural (this repository) | CC BY-NC 4.0 (this dataset) | 37 | 150 |
| Six-arm crawler (procedural) | multileg | 24 | procedural (this repository) | CC BY-NC 4.0 (this dataset) | 37 | 150 |
| Two-armed zoo body (procedural) | dual_arm | 21 | procedural (this repository) | CC BY-NC 4.0 (this dataset) | 26 | 150 |

## Skills

Development skills (used while building the method) and frozen skills (written down in advance and only used for the pre-registered transfer test).

| Skill | Set | Clips | Pass the label check |
|---|---|---|---|
| wave | development | 61 | 23 |
| point | development | 61 | 44 |
| reach forward | development | 61 | 42 |
| crouch | development | 43 | 33 |
| turn in place | development | 32 | 27 |
| trace circle | development | 60 | 24 |
| bow | frozen | 31 | 4 |
| twist | frozen | 31 | 4 |
| kick swing | frozen | 43 | 1 |
| step forward | frozen | 31 | 24 |
| tap twice | frozen | 43 | 39 |
| lift and hold | frozen | 44 | 27 |

The label check is a strict, automatic test of each skill's definition. In a blind human rating of 117 clips, the rater judged most clips that fail it to be correct, so treat it as high-precision and low-recall.

## Files

```
index/clips.jsonl          one row per clip
index/bodies.jsonl         one row per robot
index/primitives.jsonl     one row per primitive (mode or gait)
bodies/<robot>.xml         MuJoCo model the clips are in (meshes replaced by primitive colliders)
bodies/<robot>.json        measured description: joints, tips, supports, size L and time scale T
primitives/<robot>.json    the robot's primitives library: modes, gaits, coverage, model, cost
clips/<robot>/<skill>_<arm>_v<k>.npz    skill and task-blind clips
clips/<robot>/<skill>_<arm>_v<k>.json   program, checks, label check, repair history, model calls
procedural/<robot>/<robot>__<kind>__<n>.npz/.json   clips made without a model
```

Each `.npz` holds `qpos` (frames x nq, the qpos order of `bodies/<robot>.xml`; a floating base comes first as position and quaternion w,x,y,z), `qvel`, `tip_pos` (frames x tips x 3, world frame, metres), `contact` (frames x contact edges, in the order of `contact_edges` in `bodies/<robot>.json`, 1 = touching) and `fps`.

`arm` is `P` for a program over the robot's primitives and `J` for a program of direct joint keyframes (the baseline). `taskblind` clips were asked for no task at all.

## Loading

```python
from huggingface_hub import snapshot_download
import json, numpy as np

root = snapshot_download("rigby-robotics/rigby-kinematic", repo_type="dataset",
    allow_patterns=["index/*", "bodies/unitree_go2.*", "clips/unitree_go2/*"])
rows = [json.loads(l) for l in open(f"{root}/index/clips.jsonl")]
go2 = [r for r in rows if r["body"] == "unitree_go2" and r["valid"]]
clip = np.load(f"{root}/{go2[0]['npz']}")
print(go2[0]["skill"], clip["qpos"].shape, clip["fps"])
```

Or `datasets.load_dataset("rigby-robotics/rigby-kinematic", "clips")` for the index alone.

To replay a clip in MuJoCo: load `bodies/<robot>.xml`, then set `data.qpos[:] = clip['qpos'][t]` and call `mj_forward` each frame.

## How it was made

1. **Intake.** Each robot model is reduced to a portable MuJoCo model with primitive colliders, and measured: joints, limb tips, supports (point feet, soles, wheels), a length scale L and a time scale T.
2. **Primitives.** A language model reads the measurements and proposes motion modes (joint directions with shares) and gaits (cycle and phase). Each is swept and measured by forward kinematics; invalid ones go back for up to two repair rounds; a coverage rule keeps a small set.
3. **Programs.** For each skill, the model writes a keyframe program over the primitives (arm P) or over raw joints (arm J).
4. **Compile and check.** A stance solver keeps planted feet, soles and wheels fixed and the centre of mass over the support; the clip is then checked frame by frame: joint limits, self-collision, floor penetration, planted-foot slip, support, IK misses, continuity and wheel slip. Failed checks go back to the model for up to two repairs.
5. **Procedural clips** (gait, balance, drive, random, object) are made directly from the primitives with no model call.

## Limitations

- Kinematic only: no forces, torques or dynamic balance were simulated.
- The label checks are strict and human-centric; many correct clips fail them (see above).
- One clip per (robot, skill, arm, variant); there is no motion-capture ground truth.

## Licence

The clips, programs, primitives, indexes and the procedural robot models are released under the [Creative Commons Attribution-NonCommercial 4.0 International licence](https://creativecommons.org/licenses/by-nc/4.0/) (CC BY-NC 4.0): free to use, share and adapt for non-commercial purposes, with credit to the authors.

**Commercial use:** please contact the authors by opening a discussion in the Community tab of this dataset.

The robot models in `bodies/` that are derived from MuJoCo Menagerie keep their own licences (table above; see `THIRD_PARTY.md`).
