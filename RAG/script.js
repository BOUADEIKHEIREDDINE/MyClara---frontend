// script.js

// Fonction pour convertir le format RAG (Revision Sheets) en format Markmap
function convertRAGFormatToMarkmap(revisionSheets) {
    if (!Array.isArray(revisionSheets) || revisionSheets.length === 0) {
        throw new Error('Invalid revision sheets format: expected a non-empty array');
    }

    // Créer un nœud racine
    const rootNode = {
        id: "root",
        label: revisionSheets.length === 1 
            ? revisionSheets[0].title || "Revision Sheet" 
            : "Revision Sheets",
        content: revisionSheets.length === 1 
            ? (revisionSheets[0].detailed_explanation || revisionSheets[0].explanation || "")
            : `${revisionSheets.length} revision sheets generated. Click on each topic to explore.`,
        children: []
    };

    // Traiter chaque revision sheet
    revisionSheets.forEach((sheet, sheetIndex) => {
        const sheetTitle = sheet.title || `Sheet ${sheetIndex + 1}`;
        const sheetExplanation = sheet.detailed_explanation || sheet.explanation || "";
        const keyConcepts = Array.isArray(sheet.key_concepts) ? sheet.key_concepts : [];

        // Si un seul sheet, les concepts deviennent directement les enfants du root
        if (revisionSheets.length === 1) {
            // Le root a déjà le titre et l'explication
            if (keyConcepts.length > 0) {
                // Ajouter les concepts clés comme enfants directs du root
                keyConcepts.forEach((concept, conceptIndex) => {
                    rootNode.children.push({
                        id: `concept-${conceptIndex + 1}`,
                        label: concept,
                        content: sheetExplanation || concept
                    });
                });
            }
        } else {
            // Plusieurs sheets: créer un nœud pour chaque sheet
            const sheetNode = {
                id: `sheet-${sheetIndex + 1}`,
                label: sheetTitle,
                content: sheetExplanation,
                children: []
            };

            // Ajouter les concepts clés comme enfants du sheet
            if (keyConcepts.length > 0) {
                keyConcepts.forEach((concept, conceptIndex) => {
                    sheetNode.children.push({
                        id: `sheet-${sheetIndex + 1}-concept-${conceptIndex + 1}`,
                        label: concept,
                        content: sheetExplanation || concept
                    });
                });
            }

            rootNode.children.push(sheetNode);
        }
    });

    return rootNode;
}

// Fonction pour convertir notre format JSON en format Markmap
function convertToMarkmapNode(node) {
    const newNode = { content: node.label, data: node };
    if (node.children && node.children.length > 0) {
        newNode.children = node.children.map(convertToMarkmapNode);
    }
    return newNode;
}

// Fonction pour détecter et convertir automatiquement le format
function prepareMarkmapData(jsonData) {
    // Si c'est déjà le format attendu (avec id, label, content)
    if (jsonData && typeof jsonData === 'object' && jsonData.id && jsonData.label) {
        return jsonData;
    }
    
    // Si c'est le format RAG (array de revision sheets)
    if (Array.isArray(jsonData) && jsonData.length > 0) {
        const firstItem = jsonData[0];
        if (firstItem.title || firstItem.key_concepts || firstItem.detailed_explanation) {
            return convertRAGFormatToMarkmap(jsonData);
        }
    }
    
    // Si c'est un objet racine qui contient des sheets
    if (jsonData && typeof jsonData === 'object' && !jsonData.id && !jsonData.label) {
        // Essayer de trouver une propriété qui ressemble à un array de sheets
        for (const key in jsonData) {
            if (Array.isArray(jsonData[key]) && jsonData[key].length > 0) {
                const firstItem = jsonData[key][0];
                if (firstItem.title || firstItem.key_concepts || firstItem.detailed_explanation) {
                    return convertRAGFormatToMarkmap(jsonData[key]);
                }
            }
        }
    }
    
    throw new Error('Unknown data format. Expected RAG revision sheets format or markmap node format.');
}

// Fonction principale qui initialise ou met à jour la carte
function setupMindmap(jsonData, svgEl, existingInstance) {
    // Check for markmap in different possible locations
    let Markmap;
    if (window.markmap && window.markmap.Markmap) {
        Markmap = window.markmap.Markmap;
    } else if (window.Markmap) {
        Markmap = window.Markmap;
    } else if (typeof markmap !== 'undefined' && markmap.Markmap) {
        Markmap = markmap.Markmap;
    } else {
        console.error('Markmap not found. Available globals:', Object.keys(window).filter(k => k.toLowerCase().includes('mark') || k.toLowerCase().includes('d3')));
        throw new Error('Markmap library not found. Please ensure markmap-view and d3.js are loaded.');
    }
    
    // Also check for d3
    if (typeof d3 === 'undefined' && typeof window.d3 === 'undefined') {
        throw new Error('D3.js library not found. Please ensure d3.js is loaded before markmap-view.');
    }
    const options = {
        duration: 800,
        nodeMinHeight: 20,
        spacingVertical: 10,
        spacingHorizontal: 90,
        initialExpandLevel: 2
    };

    // Préparer les données (convertir si nécessaire)
    const preparedData = prepareMarkmapData(jsonData);
    const markmapRoot = convertToMarkmapNode(preparedData);

    let mm = existingInstance;
    if (!mm) {
        // Première création
        mm = Markmap.create(svgEl, options);
        
        // --- Gestionnaire de clic (attaché une seule fois) ---
        let selectedNodeElement = null;
        const contentPanel = document.getElementById('content-panel');
        const contentPlaceholder = document.getElementById('content-placeholder');
        const contentTitle = document.getElementById('content-title');
        const contentBody = document.getElementById('content-body');

        svgEl.addEventListener('click', function(event) {
            const targetNode = event.target.closest('g.markmap-node');
            if (!targetNode) return;

            const nodeData = d3.select(targetNode).datum().data.data;
            
            if (contentPlaceholder) contentPlaceholder.style.display = 'none';
            if (contentTitle) {
                contentTitle.style.display = 'block';
                contentTitle.textContent = nodeData.label || nodeData.title || 'Untitled';
            }
            if (contentBody) {
                contentBody.style.display = 'block';
                contentBody.textContent = nodeData.content || nodeData.detailed_explanation || nodeData.explanation || '';
            }
            
            if (selectedNodeElement) {
                selectedNodeElement.classList.remove('selected');
            }
            selectedNodeElement = targetNode;
            selectedNodeElement.classList.add('selected');
        });

    }

    mm.setData(markmapRoot);
    mm.fit(); // Ajuste le zoom après chaque mise à jour
    return mm; // Retourne l'instance pour la réutiliser
}

// Fonction utilitaire pour générer un mindmap depuis des revision sheets RAG
function generateMindmapFromRevisionSheets(revisionSheets, svgElement, existingInstance) {
    try {
        const markmapData = convertRAGFormatToMarkmap(revisionSheets);
        return setupMindmap(markmapData, svgElement, existingInstance);
    } catch (error) {
        console.error('Error converting revision sheets to mindmap:', error);
        throw error;
    }
}

// --- Point d'entrée du script (pour compatibilité avec l'ancien système) ---
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        // Récupération des éléments du DOM
        const svgElement = document.querySelector('#markmap-svg');
        const generateButton = document.getElementById('generate-button');
        const textInput = document.getElementById('text-input');
        const modelInput = document.getElementById('model-input');
        const loadingMessage = document.getElementById('loading-message');
        const mindmapPlaceholder = document.getElementById('mindmap-placeholder');

        // Si les éléments n'existent pas, on ne fait rien (script utilisé ailleurs)
        if (!svgElement || !generateButton) {
            return;
        }

        let mindmapInstance = null; // Variable pour stocker l'instance de la carte

        // Écouteur sur le bouton "Générer"
        generateButton.addEventListener('click', async () => {
            const text = textInput.value;
            const model = modelInput.value;

            if (!text.trim() || !model.trim()) {
                alert("Veuillez entrer un texte et un nom de modèle.");
                return;
            }

            // Gérer l'état de l'interface pendant le chargement
            if (loadingMessage) loadingMessage.style.display = 'block';
            generateButton.disabled = true;
            if (mindmapPlaceholder) mindmapPlaceholder.style.display = 'none';

            try {
                // Appel à notre backend
                const response = await fetch('http://localhost:3000/generate-mindmap', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text, model }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.details || 'La requête au serveur a échoué.');
                }

                const newMindmapData = await response.json();

                // Initialise ou met à jour la carte avec les nouvelles données
                mindmapInstance = setupMindmap(newMindmapData, svgElement, mindmapInstance);

            } catch (error) {
                console.error('Erreur de génération:', error);
                alert('Une erreur est survenue : ' + error.message);
                if (!mindmapInstance && mindmapPlaceholder) {
                    mindmapPlaceholder.style.display = 'block'; // Réafficher si la première génération échoue
                }
            } finally {
                // Rétablir l'état normal de l'interface
                if (loadingMessage) loadingMessage.style.display = 'none';
                generateButton.disabled = false;
            }
        });
    });
}
