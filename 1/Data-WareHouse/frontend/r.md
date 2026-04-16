PS C:\Users\Admin\Downloads\Data-WareHouse-main> Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force; node "c:\Users\Admin\Downloads\Data-WareHouse-main\Data-WareHouse-main\src\server.js"


Username	Password	Quyền
admin	hashed_pw_123	ADMIN (toàn quyền)
manager1	hashed_pw_123	MANAGER
staff1	hashed_pw_123	STAFF