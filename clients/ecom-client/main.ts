import { checkProgram, establishConnection, establishPayer, getAddress, getProfile, initialize, updateAddress, updateProfile } from "."


const main = async () => {
    await establishConnection();
    await establishPayer();
    await checkProgram();
    // await initialize();
    await updateAddress("Kota, Rajasthan, India");
    await getAddress();
    await updateProfile("Sachin Jangid", 16, 8, 1999);
    await getProfile();
}

main()