/*
东东农场互助码
此文件为Node.js专用。其他用户请忽略
支持京东N个账号
 */
//云服务器腾讯云函数等NOde.js用户在此处填写京东东农场的好友码。
// 同一个京东账号的好友互助码用@符号隔开,不同京东账号之间用&符号或者换行隔开,下面给一个示例
// 如: 京东账号1的shareCode1@京东账号1的shareCode2&京东账号2的shareCode1@京东账号2的shareCode2
let FruitShareCodes = [
 'fad2627b304d464e921fc1b7c35a8e88@c38299e862174bdaa2d525faa5ea7059@67b45c2bb097402d93ee4e8ce7b3cc49@2074936ceb8942cd93dcd3b9b49e4949@f8e4cb7f0abb44059c2263bef783347f',
'67b45c2bb097402d93ee4e8ce7b3cc49@c38299e862174bdaa2d525faa5ea7059@2074936ceb8942cd93dcd3b9b49e4949@f8e4cb7f0abb44059c2263bef783347f',
'f8e4cb7f0abb44059c2263bef783347f@56e40ef4ead440b4a7b9175fabdb437d@67b45c2bb097402d93ee4e8ce7b3cc49@c38299e862174bdaa2d525faa5ea7059',
'f8e4cb7f0abb44059c2263bef783347f@56e40ef4ead440b4a7b9175fabdb437d@2c6b1f428b4b4793b70645abadbe6155@67b45c2bb097402d93ee4e8ce7b3cc49',
'f8e4cb7f0abb44059c2263bef783347f@56e40ef4ead440b4a7b9175fabdb437d@2c6b1f428b4b4793b70645abadbe6155@fad2627b304d464e921fc1b7c35a8e88',
'f8e4cb7f0abb44059c2263bef783347f@56e40ef4ead440b4a7b9175fabdb437d@2c6b1f428b4b4793b70645abadbe6155@67b45c2bb097402d93ee4e8ce7b3cc49',
'2074936ceb8942cd93dcd3b9b49e4949@fad2627b304d464e921fc1b7c35a8e88@2c6b1f428b4b4793b70645abadbe6155@56e40ef4ead440b4a7b9175fabdb437d',
'2074936ceb8942cd93dcd3b9b49e4949@c38299e862174bdaa2d525faa5ea7059@2c6b1f428b4b4793b70645abadbe6155@fad2627b304d464e921fc1b7c35a8e88',
'2074936ceb8942cd93dcd3b9b49e4949@fad2627b304d464e921fc1b7c35a8e88@67b45c2bb097402d93ee4e8ce7b3cc49@67b45c2bb097402d93ee4e8ce7b3cc49',
'2074936ceb8942cd93dcd3b9b49e4949@c38299e862174bdaa2d525faa5ea7059@fad2627b304d464e921fc1b7c35a8e88@2c6b1f428b4b4793b70645abadbe6155',
'2074936ceb8942cd93dcd3b9b49e4949@fad2627b304d464e921fc1b7c35a8e88@f8e4cb7f0abb44059c2263bef783347f@56e40ef4ead440b4a7b9175fabdb437d',
'67b45c2bb097402d93ee4e8ce7b3cc49@c38299e862174bdaa2d525faa5ea7059@56e40ef4ead440b4a7b9175fabdb437d@f8e4cb7f0abb44059c2263bef783347f',
 ]
// 判断github action里面是否有水果互助码
if (process.env.FRUITSHARECODES) {
  if (process.env.FRUITSHARECODES.indexOf('&') > -1) {
    console.log(`您的东东农场互助码选择的是用&隔开\n`)
    FruitShareCodes = process.env.FRUITSHARECODES.split('&');
  } else if (process.env.FRUITSHARECODES.indexOf('\n') > -1) {
    console.log(`您的东东农场互助码选择的是用换行隔开\n`)
    FruitShareCodes = process.env.FRUITSHARECODES.split('\n');
  } else {
    FruitShareCodes = process.env.FRUITSHARECODES.split();
  }
} else if (process.env.JD_COOKIE) {
  console.log(`由于您secret里面未提供助力码，故此处运行将会给脚本内置的码进行助力，请知晓！`)
}
for (let i = 0; i < FruitShareCodes.length; i++) {
  const index = (i + 1 === 1) ? '' : (i + 1);
  exports['FruitShareCode' + index] = FruitShareCodes[i];
}
