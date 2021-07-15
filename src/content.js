const projects = {};

document.addEventListener("__xmlrequest", (event) => {
    const elements = JSON.parse(event.detail);

    if (!Array.isArray(elements))
        return;
    for (let element of elements) {
        if (typeof element !== "object" || typeof element.project !== "object" || typeof element.project.name !== "string")
            continue;
        projects[element.project.name] = element;
    }
});

function debugLog() {
    console.log("MyEpitechPercentages:", ...arguments);
}

function debugWarn() {
    console.warn("MyEpitechPercentages:", ...arguments);
}

function debugError() {
    console.error("MyEpitechPercentages:", ...arguments);
}

function includes(a, b) {
    const len = a.length;

    for(let i = 0; i < len; i++) {
        if(a[i] == b)
            return true;
    }
    return false;
}

function findParentBySelector(node, selector) {
    const all = document.querySelectorAll(selector);
    let cur = node.parentNode;

    while (cur && !includes(all, cur)) {
        cur = cur.parentNode;
    }
    return cur;
}

async function fetchProjects() {
    debugLog("Fetching projects...");
    const [kind, year] = window.location.hash?.split("/");
    if (kind == "p")
        debugLog("History not yet supported!");
    const token = localStorage.getItem("argos-api.oidc-token").replace(/"/g, "");
    const request = fetch("https://api.epitest.eu/me/" + year, {
        headers: {
            Authorization: "Bearer " + token
        }
    }).catch(debugError);
    const elements = await request.then(c => c.json()).catch(debugError);
    if (!Array.isArray(elements)) {
        debugWarn("Projects JSON is not an array!");
        return;
    }
    for (let element of elements) {
        if (typeof element !== "object" || typeof element.project !== "object" || typeof element.project.name !== "string")
            continue;
        projects[element.project.name] = element;
    }
}

async function updatePercentages() {
    debugLog("Updating percentages...");
    document.querySelectorAll(".remove-on-percentage-update").forEach(e => e.remove());
    for (const projectStatus of document.querySelectorAll(".mdl-color-text--primary.mdl-typography--title-color-contrast.mdl-cell")) {
        debugLog("Project status:", projectStatus.textContent);
        if (!projectStatus.textContent.includes("Prerequisites met") && !projectStatus.textContent.trim().startsWith("Passed - ")) continue;
        const projectNameSpan = findParentBySelector(projectStatus, ".mdl-card")?.querySelector(".mdl-card__title-text span");
        if (!projectNameSpan) {
            debugLog("Project name span not found!");
            continue;
        }
        const projectName = projectNameSpan.textContent.trim();

        if (typeof projects[projectName] === "undefined") {
            debugLog("Project " + projectName + " not fetched yet!");
            await fetchProjects();
        }
        const projectData = projects[projectName];

        const skillsArr = Object.values(projectData.results.skills);
        const passed = skillsArr.map(s => s.passed).reduce((prev, curr) => prev + curr);
        const count = skillsArr.map(s => s.count).reduce((prev, curr) => prev + curr);
        setPercentage(projectStatus, (passed / count * 100).toFixed(0));
    }
}

function setPercentage(object, percentage) {
    let color = "limegreen";
    if (percentage < 75)
        color = "orange"
    if (percentage < 25)
        color = "red";

    object.innerHTML = `
        Passed - ${percentage}%
        <div class="remove-on-percentage-update" style="height: 8px;"></div>
        <div style="height: 20px; margin-left: auto; margin-right: auto;" class="remove-on-percentage-update mdl-progress">
            <div style="z-index: 1; background-color: ${color}; border-radius: 10px; width: ${percentage}%;" class="bar"></div>
            <div style="z-index: 0; opacity: 0.3; background-color: ${color}; border-radius: 10px; width: 100%;" class="bar"></div>
        </div>
    `;
}

// -----------------------------

const observer = new MutationObserver(updatePercentages);
observer.observe(document.querySelector("body"), { attributes: true, subtree: true, attributeFilter: [ "class" ] });

document.querySelector(".mdl-layout__container").addEventListener('click', () => {
    updatePercentages();
});

// Catch XMLHttpRequest
const inject = () => {
    const send = window.XMLHttpRequest.prototype.send;
    function sendreplacement(data) {
        if (this.onreadystatechange)
            this._onreadystatechange = this.onreadystatechange;
        console.log("MyEpitechPercentages:", "Request: send");
        this.onreadystatechange = onreadystatechangereplacement;
        return send.apply(this, arguments);
    }
    function onreadystatechangereplacement(event) {
        try {
            const responseContent = event.target.response;
            if (event.target.responseURL.includes("api.epitest.eu")) {
                document.dispatchEvent(new CustomEvent('__xmlrequest', {
                    detail: responseContent
                }));
            }
        } catch(ex) { /* do not handle */ }
        if (this._onreadystatechange)
            return this._onreadystatechange.apply(this, arguments);
    }
    window.XMLHttpRequest.prototype.send = sendreplacement;

    console.log("MyEpitechPercentages:", "Injected");
};

const actualCode = '(' + inject + ')();';
const script = document.createElement('script');
script.textContent = actualCode;
(document.head || document.documentElement).appendChild(script);
script.remove();