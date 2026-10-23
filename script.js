//=============================================================================
//関数の読み込みと定義
//=============================================================================
/*HTMLからもらう情報 */
const photoInput = document.getElementById("photoInput");
const photoArea = document.getElementById("photoArea");

const modal = document.getElementById("modal");
const largeImage = document.getElementById("largeImage");
const closeButton = document.getElementById("closeButton");

const prevButton = document.getElementById("prevButton");
const nextButton = document.getElementById("nextButton");

const backupButton = document.getElementById("backupButton");
const restoreButton = document.getElementById("restoreButton");
const restoreInput = document.getElementById("restoreInput");

/*保存用の配列*/
let photos = [];

/* ID発行用 */
let nextId = 1;

/*DB用*/
let db;

//拡大縮小
let currentScale = 1;

//拡大表示中の写真管理
let currentIndex = 0;
let currentPhotos = [];

let scrollY;
//=============================================================================
//起動時の読み込み
//=============================================================================
/*DB接続*/
const request = indexedDB.open(
    "photoDB",
    1
);

request.onupgradeneeded = function(event) {

    db = event.target.result;

    //if...データベース作成の安定化
    if (!db.objectStoreNames.contains("photos")) {

        db.createObjectStore(
            "photos",
            {
                keyPath: "id"
            }
        );

    }

};

//接続成功時
request.onsuccess = function(event) {

    db = event.target.result;

    loadPhotos();

    updateStorageInfo();

};

//接続失敗時の処理
request.onerror = function(event) {

    console.error(
        "IndexedDB接続エラー",
        event
    );

    alert(
        "データベース接続に失敗しました。"
    );

};

//=============================================================================
//ファイル選択時のDB保存処理
//=============================================================================
/*保存関数、配列に画像情報を保存*/
function savePhoto(photo) {

    const transaction =
        db.transaction(
            ["photos"],
            "readwrite"
        );

    const store =
        transaction.objectStore(
            "photos"
        );

    store.put(photo);

}

function loadPhotos() {

    scrollY = window.scrollY;

    const transaction =
        db.transaction(
            ["photos"],
            "readonly"
    );
    
    const store =
        transaction.objectStore(
            "photos"
    );
    
    const request =
        store.getAll();
    
    request.onsuccess =
        function() {
        
            photos = request.result;

            /*読み込み関数*/
            for (const photo of photos) {
            
                photo.imageUrl =
                    URL.createObjectURL(
                        photo.file
                );
            
            }
            
            /*IDの更新*/
            nextId =
                Math.max(
                    ...photos.map(photo => photo.id),
                    0
                ) + 1;
            
            renderPhotosKeepScroll()
        
        };

}

/*IDの削除関数*/
function deletePhoto(id) {

    const transaction =
        db.transaction(
        ["photos"],
        "readwrite"
        );

    const store =
        transaction.objectStore(
        "photos"
        );

    store.delete(id);

}

//現在の画像
function showCurrentPhoto() {

    largeImage.src =
        currentPhotos[currentIndex].imageUrl;

}

/*配列に画像情報を保存*/
photoInput.addEventListener("change", async function(event) {

    scrollY = window.scrollY;

    const files = photoInput.files;

    for (const file of event.target.files) {

        const thumbnail = await createThumbnail(file);

        /*写真追加処理*/
        const photo = {

            id: nextId++,

            file: file,

            imageUrl:
                URL.createObjectURL(file),

            thumbnail: thumbnail,

            tags: [],

            thumbnailPosition: "center"

        };

        photos.push(photo);

        savePhoto(photo);

        updateStorageInfo();
    }

    renderPhotosKeepScroll()

});

//=============================================================================
//ファイル選択後の処理（画像、サムネイル表示方法、削除・タイトル変更）
//=============================================================================
/*写真の表示*/
function renderPhotos() {

    console.count("renderPhotos");
    
    photoArea.innerHTML = "";

    const fragment = document.createDocumentFragment();

    /*並び替え*/
    let sortedPhotos = [...photos];

    //新しい順に
    sortedPhotos.sort(
                (a, b) => b.id - a.id
            );

    for (const photo of sortedPhotos) {

        /*写真一枚分の箱を追加*/
        const photoItem = document.createElement("div");

        photoItem.className = "photoItem";

        /*仮の写真を用意&情報を設定*/
        const image = document.createElement("img");

        /*image.loading = "lazy";*/

        image.src = photo.thumbnail;

        const positionMap = {

            top: "center top",

            left: "center left",

            center: "center center",

            right: "center right",

            bottom: "center bottom"

        };

        image.style.objectPosition =
            positionMap[
                photo.thumbnailPosition
            ] || "center center";
        
        //以降、各写真ごとに与える処理
        /*写真クリック時拡大*/
        photoItem.addEventListener("click", function() {

            currentPhotos = sortedPhotos;

            currentIndex =
                currentPhotos.findIndex(
                    p => p.id === photo.id
                );

            showCurrentPhoto();

            currentScale = 1;

            largeImage.style.transform = "scale(1)";

            modal.style.display = "flex";

        });

        /*削除ボタンとその機能の追加*/
        const deleteButton = document.createElement("button");

        deleteButton.textContent = "削除";

        deleteButton.className = "deleteButton";

        deleteButton.addEventListener("click", function() {

            /*削除確認のダイアログを表示*/
            scrollY = window.scrollY;
            const result = confirm(
                "この写真を削除しますか？"
                );
                
                //いいえ
                if (!result) {
                    return;
                }
                
                //URLの解放
                URL.revokeObjectURL(
                    photo.imageUrl
                );

                /*削除ボタン処理*/
                deletePhoto(photo.id);

                updateStorageInfo();

                photos = photos.filter(
                    p => p.id !== photo.id
                );

            renderPhotosKeepScroll()

        });

        /*タイトル表示欄*/
        const tagText = document.createElement("div");
        
        /*タイトル表示欄のスタイルを設定*/
        tagText.className = "tagText";

        if (photo.tags.length === 0) {

            tagText.textContent = "---";

        } else {

            tagText.textContent = photo.tags.join(", ");

        }

        //メニューボタン
        const menuButton =
            document.createElement("button");

        menuButton.textContent = "⋮";

        menuButton.className =
            "menuButton";

        const menu =
            document.createElement("div");

        menu.className = "cardMenu";

        menu.innerHTML = `
        <div data-action="top">
            上寄せ
        </div>

        <div data-action="left">
            左寄せ
        </div>

        <div data-action="center">
            中央表示
        </div>

        <div data-action="right">
            右寄せ
        </div>
        
        <div data-action="bottom">
            下寄せ
        </div>

        <hr>

        <div data-action="edit">
            タイトル編集
        </div>

        <div data-action="delete">
            削除
        </div>
        `;

        menuButton.addEventListener(
            "click",
            function(event) {

                event.stopPropagation();

                menu.style.display =
                    menu.style.display === "block"
                    ? "none"
                    : "block";

            }
        );

        menu.addEventListener(
            "click",
            function(event) {

                scrollY = window.scrollY;

                const action =
                    event.target.dataset.action;

                if (
                    action === "top" ||
                    action === "left" ||
                    action === "center" ||
                    action === "right" ||
                    action === "bottom"
                ) {

                    photo.thumbnailPosition =
                        action;

                    savePhoto(photo);

                    renderPhotosKeepScroll()

                    return;
                }

                if (action === "edit") {

                    editTagButton.click();

                    return;
                }

                if (action === "delete") {

                    deleteButton.click();

                    return;
                }

            }
        );

        /*タイトル編集ボタン*/
        const editTagButton = document.createElement("button");

        editTagButton.textContent = "タイトル編集";

        editTagButton.className = "editTagButton";

        /*タイトル編集機能*/
        editTagButton.addEventListener("click", function() {

            scrollY = window.scrollY;

            const input = prompt(
                "タイトルを入力してください",
                photo.tags.join(",")
            );

            if (input === null) {
                return;
            }

            photo.tags = input
                .split(",")
                .map(tag => tag.trim())
                .filter(tag => tag !== "");
            
            savePhoto(photo);

            updateStorageInfo();

            renderPhotosKeepScroll()
        });

        /*実際に以上の機能をHTML側に表示*/
        photoItem.appendChild(menuButton);

        photoItem.appendChild(menu);

        photoItem.appendChild(tagText);

        /*photoItem.appendChild(image);*/

        //photoItem.appendChild(editTagButton);

        //photoItem.appendChild(deleteButton);

        fragment.appendChild(photoItem);

    }

    photoArea.appendChild(fragment);

}

//=============================================================================
//カード生成後のボタン処理（バックアップ保存・復元、拡大、画面遷移）
//=============================================================================
//バックアップ保存ボタンへ遷移
backupButton.addEventListener(
    "click",
    async function() {

        await createBackup();

    }
);

//バックアップ復元処理へ遷移
restoreButton.addEventListener(
    "click",
    function() {

        restoreInput.click();

    }
);

/*拡大時のボタン処理*/

//閉じるボタン
closeButton.addEventListener(
    "click",
    function() {
    
        modal.style.display = "none";
    
    }
);

//次へ
nextButton.addEventListener(
    "click",
    function() {

        if (
            currentIndex <
            currentPhotos.length - 1
        ) {

            currentIndex++;

            showCurrentPhoto();

        }

    }
);

//前へ
prevButton.addEventListener(
    "click",
    function() {

        if (currentIndex > 0) {

            currentIndex--;

            showCurrentPhoto();

        }

    }
);

//キーボード操作
document.addEventListener(
    "keydown",
    function(event) {

        if (
            modal.style.display !== "flex"
        ) {
            return;
        }

        if (event.key === "ArrowRight") {

            nextButton.click();

        }

        if (event.key === "ArrowLeft") {

            prevButton.click();

        }

    }
);

//=============================================================================
//バックアップ読み込み開始時の処理
//=============================================================================
//Base to file
function base64ToFile(
    dataUrl,
    fileName = "image.jpg"
) {

    const arr =
        dataUrl.split(",");

    const mime =
        arr[0]
        .match(/:(.*?);/)[1];

    const bstr =
        atob(arr[1]);

    let n = bstr.length;

    const u8arr =
        new Uint8Array(n);

    while (n--) {

        u8arr[n] =
            bstr.charCodeAt(n);

    }

    return new File(
        [u8arr],
        fileName,
        { type: mime }
    );
}

//復元処理
restoreInput.addEventListener(
    "change",
    async function(event) {

        const file =
            event.target.files[0];

        if (!file) return;

        const text =
            await file.text();

        const data =
            JSON.parse(text);

        const result =
            confirm(
                "現在のデータを上書きして復元しますか？"
            );

        if (!result) return;
        
        await clearDatabase();

        photos = [];

        for (const item of data) {

            const imageFile =
                base64ToFile(
                    item.imageData
                );

            const thumbnail =
                await createThumbnail(
                    imageFile
                );

            const photo = {

                id: item.id,

                file: imageFile,

                imageUrl:
                    URL.createObjectURL(
                        imageFile
                    ),

                thumbnail:
                    thumbnail,

                tags:
                    item.tags || [],

                thumbnailPosition:
                    item.thumbnailPosition || "center"

            };

            photos.push(photo);

            savePhoto(photo);

            updateStorageInfo();

        }

        nextId =
            Math.max(
                ...photos.map(
                    p => p.id
                ),
                0
            ) + 1;

        renderPhotos()

        alert(
            "復元が完了しました。"
        );

    }
);

//=============================================================================
//バックアップ保存開始時の処理
//=============================================================================
async function createBackup() {

    const backupData = [];

    for (const photo of photos) {

        const imageData =
            await fileToBase64(
                photo.file
            );

        backupData.push({

            id: photo.id,

            tags: photo.tags,

            thumbnailPosition:
                photo.thumbnailPosition,

            imageData: imageData

        });

    }

    const json =
        JSON.stringify(
            backupData,
            null,
            2
        );

    const blob =
        new Blob(
            [json],
            {
                type:
                "application/json"
            }
        );

    const url =
        URL.createObjectURL(blob);

    const a =
        document.createElement("a");

    a.href = url;

    a.download =
        "photo_backup.json";

    a.click();

    URL.revokeObjectURL(url);

}

//file to Base変換
function fileToBase64(file) {

    return new Promise(
        (resolve) => {

            const reader =
                new FileReader();

            reader.onload =
                function() {

                    resolve(
                        reader.result
                    );

                };

            reader.readAsDataURL(
                file
            );

        }
    );

}

//DBの重複防止
async function clearDatabase() {

    return new Promise(
        (resolve, reject) => {

            const transaction =
                db.transaction(
                    ["photos"],
                    "readwrite"
                );

            const store =
                transaction.objectStore(
                    "photos"
                );

            const request =
                store.clear();

            request.onsuccess =
                () => resolve();

            request.onerror =
                () => reject();

        }
    );

}

//=============================================================================
//拡大時の処理
//=============================================================================
//拡大縮小処理
/*largeImage.addEventListener(
    "wheel",
    function(event) {

        document.body.style.overflow = "hidden";

        event.preventDefault();

        const rect =
            largeImage.getBoundingClientRect();

        const x =
            ((event.clientX - rect.left)
            / rect.width) * 100;

        const y =
            ((event.clientY - rect.top)
            / rect.height) * 100;

        largeImage.style.transformOrigin =
            `${x}% ${y}%`;

        if (event.deltaY < 0) {

            currentScale *= 1.1;

        } else {

            currentScale /= 1.1;

        }

        currentScale =
            Math.max(
                1,
                Math.min(currentScale, 10)
            );

        largeImage.style.transform =
            `scale(${currentScale})`;

    }
);*/

// 閉じるボタン
closeButton.addEventListener("click", function() {

    modal.style.display = "none";
    document.body.style.overflow = "";

});

//=============================================================================
//その他処理
//=============================================================================
//サムネイルの表示処理
function createThumbnail(file) {

    return new Promise((resolve) => {

        const img = new Image();

        img.onload = function() {

            const canvas =
                document.createElement("canvas");

            const width =  600;

            const scale =
                width / img.width;

            canvas.width = width;

            canvas.height =
                img.height * scale;

            const ctx =
                canvas.getContext("2d");

            ctx.drawImage(
                img,
                0,
                0,
                canvas.width,
                canvas.height
            );

            resolve(
                canvas.toDataURL(
                    "image/jpeg",
                    1.0
                )
            );

        };

        img.src =
            URL.createObjectURL(file);

    });

}

//ストレージ計算処理
async function updateStorageInfo() {

    const estimate =
        await navigator.storage.estimate();

    const usedGB =
        estimate.usage /
        1024 /
        1024 /
        1024;

    const quotaGB =
        estimate.quota /
        1024 /
        1024 /
        1024;

    const percent =
        Math.round(
            usedGB /
            quotaGB *
            100
        );

    document.getElementById(
        "storagePercent"
    ).textContent =
        percent + "%";

    document.getElementById(
        "storageInfo"
    ).innerHTML =
        `
        （残量 ${usedGB.toFixed(2)} GB
        /${(quotaGB - usedGB).toFixed(2)} GB）
        `;
}

//スクロール固定
function renderPhotosKeepScroll() {

    renderPhotos();

    setTimeout(() => {
        window.scrollTo(0, scrollY);
    },100);

    console.log("固定",scrollY);

}

//serviceWorker登録
if (
    "serviceWorker" in navigator
) {

    navigator.serviceWorker.register(
        "service-worker.js"
    );

}
//=============================================================================