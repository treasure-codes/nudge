import json
import urllib.request
import os

steps = [141, 159, 160, 161, 170, 171, 172]
base_path = r"C:\Users\treas\.gemini\antigravity\brain\5c63ec2d-9306-4dde-a4f6-660409672b4b\.system_generated\steps"
out_dir = r"c:\Users\treas\OneDrive\Desktop\nudge-1\docs\ui-designs"

os.makedirs(out_dir, exist_ok=True)

names = {
    141: "01_Home",
    159: "02_Set_Journey",
    160: "03_Journey_Active",
    161: "04_Wake_Up_Warning",
    170: "05_Alarm_Sounding",
    171: "06_Missed_Stop",
    172: "07_Profile_Settings"
}

for step in steps:
    file_path = os.path.join(base_path, str(step), "output.txt")
    if not os.path.exists(file_path):
        print(f"Skipping {step}, file not found.")
        continue
        
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    for comp in data.get("outputComponents", []):
        if "design" in comp and "screens" in comp["design"]:
            for i, screen in enumerate(comp["design"]["screens"]):
                name = names[step]
                
                # Image
                img_url = screen.get("screenshot", {}).get("downloadUrl")
                if img_url:
                    img_path = os.path.join(out_dir, f"{name}.png")
                    print(f"Downloading image {name}...")
                    urllib.request.urlretrieve(img_url, img_path)
                    
                # HTML
                html_url = screen.get("htmlCode", {}).get("downloadUrl")
                if html_url:
                    html_path = os.path.join(out_dir, f"{name}.html")
                    print(f"Downloading HTML {name}...")
                    urllib.request.urlretrieve(html_url, html_path)
                    
print("Done!")
